---
title: "Goroutine 은 어떻게 동작할까?"
date: 2021-05-17T00:45:48+09:00
draft: false
description: "goroutine 이 커널 스레드와 무엇이 다른지, Go 런타임 스케줄러가 스레드 재활용·개수 제한·분산 runqueue 라는 세 가지 아이디어로 이를 어떻게 처리하는지 정리했습니다."
tags: [golang]
---

> 본 포스트는 GopherCon 2018 [Kavya Joshi](https://www.linkedin.com/in/kavyajoshi/) 의 [The Scheduler Saga](https://youtu.be/YHRO5WQGh0k) 발표를 재구성하여 작성하였습니다.

## Intro

Golang 의 장점으로 빠짐없이 언급되는 것이 바로 강력한 동시성 지원입니다.
이 강력한 동시성에서 빠질 수 없는 요소가 바로 `goroutine` 입니다.
개발자는 `go` 키워드를 통해 `goroutine` 을 생성함으로서 손쉽게 동시성을 지원하는 프로그램을 개발할 수 있습니다.
Channel 을 사용하면 `goroutine` 간에 데이터를 손쉽게 전달할 수 도 있죠.

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    go f()

    fmt.Println("hello world")
    time.Sleep(10 * time.Second)
}

func f() {
    for i := 0; i < 5; i++ {
        fmt.Printf("count: %d\n", i)
        time.Sleep(1 * time.Second)
    }
}
// hello world
// count: 0
// count: 1
// count: 2
// count: 3
// count: 4
```

얼핏 보면 `goroutine` 은 다른 프로그래밍 언어에서 사용되는 Thread 와 같다고 생각할 수 있습니다.
하지만, [A Tour of Go](https://tour.golang.org/concurrency/1) 에서는 `goroutine` 을 아래와 같이 정의하고 있습니다.

> "lightweight thread managed by the Go runtime"

직역해보면 Go runtime 에 의해 관리되는 경량화된 스레드인데, 왠지 Thread 와는 다른 듯한 뉘앙스를 풍깁니다.
`goroutine` 은 무엇이고, 어떻게 동작하는지 한번 알아보겠습니다.

## Goroutine != (Kernel) Thread

`goroutine` 은 커널 스레드 와는 다른 리소스입니다.
위에서 `lightweight thread` 라고 정의 내렸던 만큼, `goroutine` 은 스레드보다 경량화된 동시성을 위한 리소스 입니다.
스케줄러에 의해 관리되고, 개별 스택을 가지며 프로세스와 힙 영역을 공유하는 등 많은 부분에서 스레드와 비슷하게 동작하지만,
스레드와 동작 방식이 다른 부분이 존재하며 더 가볍게 동작하게 됩니다.

먼저, `goroutine` 의 기본 스택 영역은 2KB 정도로, 스레드 기본 스택 영역인 8KB (32-bit 기준) 보다 작습니다.
또한, 생성 / 삭제 및 Context switch 시 스레드는 수 μs 정도 걸리는 반면 `goroutine` 은 수십 ns 만에 완료됩니다.
스레드 생성 및 삭제에는 System Call 이 수행되어야 하지만, `goroutine` 은 System Call 없이 유저 스페이스에서 동작을 완료할 수 있기 때문입니다.

<figure class="left">
  <img src="/assets/posts/how-goroutine-works/goroutine-external-structure.png" alt="커널 스레드 위에서 실행되는 Goroutine" width="406" height="252" loading="lazy" decoding="async" />
  <figcaption class="center">[그림-1] 커널 스레드 위에서 실행되는 Goroutine</figcaption>
</figure>

이렇게 가벼운 `goroutine` 은 스레드 위에서 스케줄링되어 동작하게 됩니다.

<figure class="left">
  <img src="/assets/posts/how-goroutine-works/goroutine-binding.png" alt="Goroutine 의 실행구조" width="375" height="462" loading="lazy" decoding="async" />
  <figcaption class="center">[그림-2] Goroutine 의 실행구조</figcaption>
</figure>

또한 위와 같이 하나의 OS 커널 스레드 에 바인딩된 논리적 프로세서에서 실행되며,
`goroutine` 이 실행 가능한 상태가 되면 실행 큐에 추가되어 실행되게 되죠.

한가지 의문점이 있습니다. 커널 스레드의 경우 OS 스케줄러에 의해 관리된다고 했습니다.
그렇다면 `goroutine` 은 누가 관리해 줄까요?

## Go Runtime Scheduler

goroutine 은 `Runtime Scheduler` 에 의해 관리됩니다.
`Runtime Scheduler` 는 Go 프로그램이 실행되는 시점에 함께 실행되며,
goroutine 을 효율적으로 스레드에 스케줄링 시키는 역할을 수행합니다.

아래와 같은 원칙을 가지고 goroutine 을 적절하게 스케줄링 시키게 됩니다.

- 커널 스레드는 비싸기 때문에 되도록 작은 수를 사용한다.
- 많은 수의 goroutine 을 실행하여 높은 `Concurrency` 를 유지한다.
- N 코어 머신에서, N 개의 goroutine 을 `Parallel` 하게 동작시킨다.

내부적으로 어떤 방식을 통하여 goroutine 을 스케줄링 시키는지 알아보겠습니다.

## runqueue

먼저, `runqueue` 라는 리소스에 대해서 알아보겠습니다.

goroutine 작업들은 스레드 별로 Heap 영역에 할당된 `runqueue` 에 의해 추적됩니다.
이름에서 알 수 있듯이 `runqueue` 는 FIFO 형태의 큐 자료구조를 가지며, 실행 가능한 상태의 goroutine 들을 보관합니다.

```go
type schedt struct {
    ...
	// Global runnable queue.
	runq     gQueue
	runqsize int32
    ...
}
// https://github.com/golang/go/blob/3b304ce7fe35b9d1e8cf0b0518ed2550c361a010/src/runtime/runtime2.go#L777
```

`[그림-2]` 에서 Processor 에 대기 중인 goroutine 들이 여기에 보관됩니다.

## Scheduler Idea

그럼 이제 본격적으로 goroutine 을 스레드에 스케줄링 하는 아이디어들을 살펴봅시다.

### idea I: Reuse threads

> Create threads when needed; Keep them around for reuse

Runtime Scheduler 는 goroutine 이 필요할 때 스레드를 생성합니다.
스레드에 더이상 실행할 goroutine 이 없다면 어떻게 하는게 좋을까요?
아시다시피, 스레드를 종료할 때도 System Call (`pthread_exit`) 이 필요하며,
자원 반납 과정에서의 로드가 존재합니다.
또한 다시 스레드를 생성할 때에도 같은 부하가 발생합니다.
Runtime Scheduler 는 이 과정을 생략하고, 스레드를 `idle` 상태로 둡니다.
스레드가 `idle` 상태가 되면, CPU 코어를 사용하지 않고 대기할 수 있습니다.
이렇게 idle 상태가 된 스레드 리스트는 별도로 보관하게 됩니다.

이렇게 스레드를 재활용하는 아이디어로, 스레드 생성/삭제에 대한 부하 없이 고루틴을 스레드에 빠르게 스케줄링 할 수 있습니다.

goroutine g1 이 실행되고, 종료 후 g2 가 실행되는 과정

1. `g1` 이 생성되고, local runqueue 에 추가됨
2. 메인 스레드를 포함하여 모든 스레드가 busy 이므로, 새로운 스레드(`T1`) 를 생성하고 `g1` 을 `T1` 에 스케줄링
3. `g1` 의 작업이 끝나고 `T1` 스레드는 종료되지 않고 idle 상태로 보관됨
4. 새로운 goroutine `g2` 가 생성되고, idle 상태의 스레드 `T1` 을 재활용하여 실행

<figure class="left">
  <img src="/assets/posts/how-goroutine-works/reuse-thread.webp" alt="커널 스레드 재활용" width="760" height="334" loading="lazy" decoding="async" />
  <figcaption class="center">[그림-3] 커널 스레드 재활용</figcaption>
</figure>

스레드를 재사용하는 것은 정말 좋은 아이디어 같습니다. 하지만, 여기서도 문제가 있습니다.
만약 현재 상태에서 goroutine 이 끊임없이 생성되면 어떻게 될까요?
모든 스레드가 계속 busy 상태이기 때문에, 스레드는 계속해서 생성되고,
이렇게 되면 idle 상태의 스레드가 엄청나게 쌓일 수 있습니다.
이 문제는 어떻게 해결하면 좋을까요?

### idea II: Limit threads accessing runqueue

간단하게, 생성할 수 있는 스레드 수를 제한함으로서 해결이 가능합니다.
`특정 조건`으로 스레드 수를 제한하면, 더이상 스레드가 생성되지 않게 할 수 있고,
실행 가능한 goroutine 을 대기시킴으로서 적절하게 프로세싱 파워를 사용할 수 있습니다.

이 `특정 조건`은 어떻게 결정하는게 좋을까요?
Go 에서는 이 조건을 CPU 코어의 갯수로 제한합니다.
생성되는 스레드를 CPU 코어 갯수만큼만 생성하도록 하는 것이죠.
이렇게 모든 CPU 코어가 스레드를 실행하게 함으로서 적정 수준의 Parallelism 을 달성할 수 있게 됩니다.

이 갯수는 디폴트 값으로 CPU 코어 갯수로 지정되지만,
`rumtime.GOMAXPROCS` 로 설정이 가능합니다.
이 설정은 하나의 노드에서 여러 Go 프로그램을 실행시킬 때 좀 더 좋은 성능을 위해 조절하기도 합니다.

<figure class="left">
  <img src="/assets/posts/how-goroutine-works/limit-thread.png" alt="커널 스레드 갯수 제한 (CPU 코어 = 2)" width="1520" height="337" loading="lazy" decoding="async" />
  <figcaption class="center">[그림-4] 커널 스레드 갯수 제한 (CPU 코어 = 2)</figcaption>
</figure>

위 그림에서, CPU 코어가 2개인 상황에서 `g2` 가 실행되어야 하는 시점에,
모든 스레드가 busy 상태이면 CPU 코어 갯수 (2개) 이상으로 스레드를 생성하지 않고 대기합니다.
이후 메인 스레드에서 다른 goroutine 의 데이터를 받기 위해 `<-ch` 로 블록되는 시점에 g2 가 메인 스레드에서 동작하게 됩니다.

또한 이 Limit 은 goroutine 을 실행하고 있는 스레드로 제한됩니다.
System Call 에서 사용되는 스레드는 이 조건에 포함되지 않습니다.
이 조건은 잠시 후 알아보도록 하겠습니다.

지금까지는 runqueue 가 글로벌하게 하나만 있다는 가정 하에 시뮬레이션을 진행했습니다.
하지만 단일 runqueue 환경에서는 goroutine 은 만족할만한 성능을 내지 못합니다.
runqueue 는 Heap 영역에 있는 공동의 리소스이고,
여기에 접근하여 enqueue, dequeue 작업을 하기 위해서는 goroutine 이 생성될 때마다 Lock 이 필요하기 때문입니다.

그래서 Go 에서는 스레드 별로 `local runqueue` 를 사용합니다.

### idea III: Distributed runqueues

> Use N runqueues on an N-core machine

스레드는 각각 `local runqueue` 를 가집니다.
스레드는 local runqueue 에 실행할 goroutine 을 가지고,
이 goroutine 들을 가져와 실행하게 됩니다.

그럼 위에서 살펴보았던 과정을 local runqueue 를 추가하여 다시 한번 시뮬레이션 해봅시다.

1. g1 goroutine 이 생성되어 runq A 에 추가됨
2. 모두 busy 스레드이기 때문에 새로운 스레드 T1 생성
3. T1 이 g1 을 실행하려 하지만, runq B 에는 goroutine 이 없는 상태

<figure class="left">
  <img src="/assets/posts/how-goroutine-works/local-runqueue-1.webp" alt="스레드별 local runqueue 상황에서의 스케줄링" width="760" height="331" loading="lazy" decoding="async" />
  <figcaption class="center">[그림-5] 스레드별 local runqueue 상황에서의 스케줄링</figcaption>
</figure>

보시다시피, runq B 에는 할당된 goroutine 이 없기 때문에 실행시킬 goroutine 이 없습니다.
어떻게 해야 할까요?

이런 상황에서, Runtime Scheduler 는 다른 local runqueue 의 goroutine 작업들을 `훔칩`니다.
자신의 runqueue 가 비어있는 경우, 다른 local runqueue 를 랜덤하게 선택한 후, goroutine 작업의 `절반`을 훔쳐옵니다.

```go
// stealWork attempts to steal a runnable goroutine or timer from any P.
//
// If newWork is true, new work may have been readied.
//
// If now is not 0 it is the current time. stealWork returns the passed time or
// the current time if now was passed as 0.
func stealWork(now int64) (gp *g, inheritTime bool, rnow, pollUntil int64, newWork bool) {
    ...
    				if gp := runqsteal(pp, p2, stealTimersOrRunNextG); gp != nil {
					return gp, false, now, pollUntil, ranTimer
				}
    ...
}
// https://github.com/golang/go/blob/03886707f9e8db668bd1fd7b8f99799dba0408e3/src/runtime/proc.go#L3013
```

위 코드에서 work stealing 을 확인할 수 있습니다.

<figure class="left">
  <img src="/assets/posts/how-goroutine-works/local-runqueue-2.webp" alt="Work Stealing" width="760" height="343" loading="lazy" decoding="async" />
  <figcaption class="center">[그림-6] Work Stealing</figcaption>
</figure>

`[그림-5]` 의 과정을 다시 살펴보면, 위와 같이 다른 runqueue 의 작업을 훔쳐와 T1 스레드에서 동작시키는 것을 볼 수 있습니다.
이렇게 다른 runqueue 의 작업의 절반을 가져옴으로서 전체적으로 작업도 골고루 분배될 수 있습니다.

## Blocking System call

다음과 같이 goroutine 을 사용한다고 가정해 봅시다.

```go
func process(image) { // g1
    // goroutine 생성
    go reportMetrics() // g3

    complicatedAlgorithm(image)

    // 파일 Write
    f, err := os.OpenFile() // goroutine & thread block
    ...
}
```

`g1` 이 `g3` 를 생성하고, I/O 작업 (Blocking system call) 을 수행합니다.
지금까지 내용을 바탕으로 유추해 보면, CPU 코어 갯수가 2개인 환경에서,
위와 같은 상황에서는 `main` goroutine 와 `g1` goroutine 이
각각 스레드를 사용하고 있으므로, `g3` 는 아직 실행되지 못하고 대기할 것입니다.
그리고 `g1` 은 `os.OpenFile()` 함수를 사용해 I/O 작업을 수행합니다.
Blocking system call 을 수행하게 되면, 응답이 올때까지 스레드는 Blocking 됩니다.
따라서 `g3` goroutine 은 system call 이 완료될 때까지 대기하게 되죠.

이런 상황에서 Runtime Scheduler 는 어떻게 이 문제를 해결할까요?

### Hand off

Runtime Scheduler 는 Background 모니터 스레드를 통해 일정 시간 블로킹 된 스레드를 감지합니다.
블로킹 스레드가 감지되고, idle 스레드가 없으면, 모니터는 스레드를 새로 만듭니다.

> 위에서 스레드 Limit 은 goroutine 을 실행하고 있는 스레드로 제한된다고 하였지만,
> System call 에서 사용되는 스레드는 이 조건에 포함되지 않는다고 하였습니다.
> 때문에 Blocking system call 을 수행하는 스레드는 이 Limit 에 포함되지 않습니다.

이렇게 새로 만들어진 스레드의 runqueue 에, 기존에 쌓여있던 goroutine 작업들을 `handoff` 해줍니다.

<figure class="left">
  <img src="/assets/posts/how-goroutine-works/runqueue-handoff.png" alt="Runqueue Handoff" width="1520" height="399" loading="lazy" decoding="async" />
  <figcaption class="center">[그림-7] Runqueue Handoff</figcaption>
</figure>

`handoff` 를 통해서 goroutine 의 starvation 을 방지할 수 있습니다.

## 정리

Go 의 Runtime Scheduler 는 여러 아이디어를 바탕으로 경량화된 스레드를 최적화하여 스케줄링 할 수 있는 방법들을 고안해 내었습니다.

- 스레드의 재사용
- Goroutine 이 동작하는 스레드 갯수의 제한 (GOMAXPROCS)
- 분산된 runqueue
- work stealing, handoff

runqueue 가 Linux 스케줄러처럼 priority 를 제공하지 못하는 문제, 실제 system topology 를 반영하지 못하는 문제 등
아직 해결해야할 문제들이 많습니다.
하지만 goroutine 과 runtime scheduler 에 구현된 개념들이 강력한 아이디어인 것은 틀림없는 것 같습니다.

`Kavya Joshi` 의 발표는 정말 쉽고 재밌게, 그리고 꼬리에 꼬리를 무는 문제점들과 그 해결법을 바탕으로 진행되어 흥미진진하게 들을 수 있어
공부하는데 도움이 많이 되는것 같습니다. 다른 발표들도 흥미로우니 한번쯤 들어보면 좋을것 같습니다.

- [Understanding Channels](https://www.youtube.com/watch?v=KBZlN0izeiY&t=11s)
- [Let's talk locks!](https://www.youtube.com/watch?v=tjpncm3xTTc)

이 포스트에서 언급된 내용 이외에도,

- sysmon 의 long running goroutine 감지 및 unschedule
- global runqueue

에 대한 내용이 [발표](https://youtu.be/YHRO5WQGh0k) 뒷부분에 있습니다.

---

Go 의 장점에서 왜 항상 강력한 동시성이 빠짐없이 등장하는지 아주 깊지는 않지만 조금은 이해가 되는 발표였습니다.
