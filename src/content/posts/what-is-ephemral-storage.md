---
title: "Kubernetes 의 Ephemeral Storage 리소스 이해하기"
date: 2021-06-29T19:30:48+09:00
draft: false
description: "Kubernetes 의 ephemeral-storage 리소스가 정확히 무엇을 계산하는지, kubelet 이 사용량을 어떻게 측정하고 어떤 조건에서 Pod 을 Evict 하는지 직접 테스트하며 살펴봅니다."
tags: [kubernetes]
---

## Intro

Kubernetes 는 실행 중인 컨테이너에서 사용할 리소스의 양을 지정할 수 있는 기능을 지원합니다.  
리소스는 Pod 스펙 중 `spec.containers[].resources.reequests` 혹은 `spec.containers[].resources.limits` 로 지정이 가능합니다.

컨테이너에 대한 리소스 요청 (request) 을 지정하면 스케줄러가 이 리소스를 보고 해당 Pod 이 배치될 노드를 결정하며,
컨테이너에 대한 리소스 제한 (limit) 을 지정하면 실행 중인 컨테이너가 이 제한보다 많은 리소스를 사용할 수 없도록 제한하게 됩니다.
이 리소스 제한을 넘어가게 되면, Pod 이 Evict 되고 다른 노드로 넘어가는 등 운영 중에 생각지 못한 일이 발생할 수 있습니다.

리소스는 다음과 같이 여러 타입이 있습니다.

- cpu
- memory
- ephemeral-storage

위와 같은 리소스 외에도, 어드민이 확장 리소스를 정의하여 사용할 수 도 있습니다.

cpu 나 memory 의 경우 의미하는 바가 명확해 보이지만, `ephemeral-storage` 는 조금 생소해 보입니다.  
이름만으로 유추해 보자면, ephemeral 은 '임시' 라는 뜻을 가지고 있으므로, 임시 저장소 정도의 느낌이 될것 같은데,  
컨테이너 환경에서는 볼륨을 마운트 하지 않는 이상 데이터가 휘발성이 되기 때문에 이 임시 스토리지라는 이름은 조금 모호하게 느껴집니다.  
특히 Kubernetes 환경으로 넘어가게 되면 Pod 내의 컨테이너리끼리 디렉토리를 공유하는 `Emptydir`, 컨테이너 생성 전 초기화 작업을 진행하는 `initContainers` 같은 스펙 등으로 임시 저장소로 쓸 수 있는 요소들이 많아져 더더욱 헷갈립니다. (저는 그랬습니다..)

## 컨테이너의 ephemeral storage resources

먼저, 컨테이너에 국한해서 Ephemeral Storage, 즉 임시 저장소로 포함될 수 있는 것들에 대해서 체크해 볼까요?

### rootfs

컨테이너는 이미지 레이어 위에서 휘발성으로 동작합니다.  
이 말은, 도커 이미지를 빌드할 때 명시되지 않은 디렉토리나 파일은 컨테이너가 내려가면 삭제된다는 뜻입니다.  
아무리 컨테이너 위에서 파일을 쓰고 디렉토리를 만들어도 컨테이너가 내려가는 즉시 없어지는 휘발성 데이터이죠.

그럼 컨터이너에 접근하여 Write 되는 데이터들은 어디에 저장될까요?  
Docker [Storage Driver](https://docs.docker.com/storage/storagedriver/select-storage-driver/) 에 따라 저장되는 위치가 다르긴 하지만,  
분명 호스트 어딘가에 저장될 것이고 컨테이너가 내려가지 않고 데이터가 쌓이게 되면 호스트에 영향을 줄 것이 분명합니다. (filesystem full 등)

> Docker storage driver 는 이 포스트에서는 다루지 않습니다.

### container log

컨테이너 내에서 포그라운드로 실행되는 프로세스는 stdout 으로 로그들을 내보내고, 이 로그들은 보통 `docker logs` 커맨드로 확인 할 수 있습니다.

```sh
$ docker run -d --name hello hello-world
a77cb544c0867a4c9a36f9acb22abe64b3fd598579311a7516243962522e08da

$ docker logs hello
Hello from Docker!
This message shows that your installation appears to be working correctly.
...
```

container log 역시 호스트에 JSON 형태로 저장됩니다. 그리고 이 container log 가 많아지면 호스트에 영향을 줄 수 있습니다.  
따라서 `container log` 역시 임시 저장소, `Ephemeral Storage` 에 포함됩니다.

## Kubernetes의 ephemeral storage resources

`rootfs`, `container log` 두개로만 합산하여 Ephemeral Storage 사용량을 계산하면 참 간단하겠지만, Kubernetes 환경은 생각보다 만만치 않습니다. (?)  
Ephemeral Storage 리소스에 제한을 두는 것은, 노드에 뜨는 컨테이너에 의해 영향받는 노드의 로컬 스토리지 가용량을 제어하려 하는 이유이고,
Kubernetes 에서는 Pod 에서 호스트의 로컬 스토리지를 사용할 수 있는 방법을 제공하고 있기 때문입니다.

### hostPath

`hostPath` 볼륨은 `Docker` 에서 `--volume` 옵션을 사용하는 것과 같이 호스트에 존재하는 파일 혹은 디렉토리를 Pod 에 마운트하여 사용하는 방식입니다.  
이 `hostPath` 볼륨은 클러스터 운용을 위한 어드민 데몬 외에 사용을 권장하고 있지 않습니다. 따라서 kube-system 혹은 다른 어드민 네임스페이스 외에는 보통 Pod Security Policy 를 통해 hostPath 볼륨의 사용을 제한합니다.  
실제로도 운영 환경에서 일반적인 어플리케이션을 배포할 때 `hostPath` 를 사용하는 케이스는 찾기가 쉽지 않죠.  
Kubernetes 에서도 이 `hostPath` 볼륨에 대해서는 따로 limit 을 걸고 있지 않습니다.

### emptydir

Kubernetes 에서는 Pod 안에 있는 Container 끼리 특정 디렉토리로 데이터를 공유할 수 있는 `emptydir` 이라는 스펙을 지원합니다.  
`emptydir` 을 포함한 Pod 이 생성되면, Kubelet 은 호스트에 빈 디렉토리를 생성하여 Pod 에 마운트 해줍니다.  
Pod 이 내려가면 `emptydir` 내에 저장되어 있던 데이터도 사라지므로 임시 저장소라고 할 수 있습니다.  
다만, `hostPath` 볼륨과는 다르게 클러스터 어드민 외에도 흔하게 쓸 수 있는 리소스이기 때문에 제한을 두는 것이 좋아 보입니다.

> 이 포스트에서는 `emptyDir.medium "Memory"` 은 고려하지 않습니다.

## Ephemeral Storage 를 어떻게 계산할까?

위에서 우리는 Ephemeral Storage 에 포함될 수 있는 리소스들을 Container / Kubernetes 환경별로 살펴 보았습니다.

정리해보면,

- rootfs
- container log
- emptydir

위 세개의 리소스가 `ephermeral storage` 의 사용량에 영향을 미친다는 것을 알 수 있습니다.

> 사실 GitRepo, ConfigMap 등 Kubernetes 환경에서는 영향을 미치는 리소스가 더 있습니다만, 생략합니다.

그렇다면 `Kubernetes` 에서는 위 세 개의 리소스를 가지고 어떻게 ephemeral storage 사용량을 계산하고 Pod 을 Evict 시킬까요?

Kubernetes 소스에서 local storage 에 대한 eviction 을 체크하는 함수인 `localStorageEviction` 을 살펴봅시다.  
이 함수는 주기적으로 실행되며, 클러스터 내에서 Local Storage Limit 을 초과한 Pod 을 Eviction 시켜줍니다.

```go
// localStorageEviction checks the EmptyDir volume usage for each pod and determine whether it exceeds the specified limit and needs
// to be evicted. It also checks every container in the pod, if the container overlay usage exceeds the limit, the pod will be evicted too.
func (m *managerImpl) localStorageEviction(pods []*v1.Pod, statsFunc statsFunc) []*v1.Pod {
	evicted := []*v1.Pod{}
	for _, pod := range pods {
		podStats, ok := statsFunc(pod)
		if !ok {
			continue
		}

		if m.emptyDirLimitEviction(podStats, pod) {
			evicted = append(evicted, pod)
			continue
		}

		if m.podEphemeralStorageLimitEviction(podStats, pod) {
			evicted = append(evicted, pod)
			continue
		}

		if m.containerEphemeralStorageLimitEviction(podStats, pod) {
			evicted = append(evicted, pod)
		}
	}

	return evicted
}

// https://github.com/kubernetes/kubernetes/blob/af0b4c9031bd26aa5ce6b2ef4fc66cae14e183dc/pkg/kubelet/eviction/eviction_manager.go#L453
```

위 코드는 다음과 같이 동작합니다.

1. 인자로 넘어온 Pod 들을 순회하며
2. 현재 Pod 이 Evict 되어야 하는지 판단 후 Evict 시키고, 배열에 append
3. Append 된 Pod 배열을 리턴

현재 Pod 이 Evict 되어야 할지의 판단은 아래 세 종류로 판단합니다.

- `emptyDirLimitEviction`
- `podEphemeralStorageLimitEviction`
- `containerEphemeralStorageLimitEviction`

### emptyDirLimitEviction

이 함수는 `emptyDir` 의 사용량을 보고 Eviction 여부를 판단합니다.  
해당 Pod 이 `emptyDir` 이 있는지 체크하고, 있다면 현재 사용량과 Limit 을 비교합니다.

먼저 `emptydir` 은 `sizeLimit` 이라는 스펙을 가질 수 있는데요,  
다음과 같이 사용됩니다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test
spec:
  containers:
    - name: nginx
      image: nginx
      volumeMounts:
        - name: emptydir
          mountPath: "/emptydir"
  restartPolicy: Never
  volumes:
    - name: test
      emptyDir:
        sizeLimit: "1Gi"
```

여기서 명시된 `sizeLimit` 을 Limit 으로 두고 사용량을 검사하게 됩니다.

만약 sizeLimit 을 명시하지 않는다면, Pod 의 ephemeral storage 사용량에 합산되며
이 수치를 넘어서면 `podEphemeralStorageLimitEviction` 에 따라 Pod 이 Evict 됩니다.

> Emptydir 이 앞서 주석으로 언급되었던 "Memory" 타입으로 사용되게 되면, memory 사용량으로 합산됩니다.

### containerEphemeralStorageLimitEviction

이 함수는 Pod 내 컨테이너들의 사용량을 측정하고, 해당 컨테이너의 제한보다 많이 사용하게 되면 Pod 을 Eviction 시킵니다.

```go
func (m *managerImpl) containerEphemeralStorageLimitEviction(podStats statsapi.PodStats, pod *v1.Pod) bool {
	thresholdsMap := make(map[string]*resource.Quantity)
	for _, container := range pod.Spec.Containers {
		ephemeralLimit := container.Resources.Limits.StorageEphemeral()
		if ephemeralLimit != nil && ephemeralLimit.Value() != 0 {
			thresholdsMap[container.Name] = ephemeralLimit
		}
	}

	for _, containerStat := range podStats.Containers {
		containerUsed := diskUsage(containerStat.Logs)
		if !*m.dedicatedImageFs {
			containerUsed.Add(*diskUsage(containerStat.Rootfs))
		}

		if ephemeralStorageThreshold, ok := thresholdsMap[containerStat.Name]; ok {
			if ephemeralStorageThreshold.Cmp(*containerUsed) < 0 {
				if m.evictPod(pod, 0, fmt.Sprintf(containerEphemeralStorageMessageFmt, containerStat.Name, ephemeralStorageThreshold.String()), nil) {
					metrics.Evictions.WithLabelValues(signalEphemeralContainerFsLimit).Inc()
					return true
				}
				return false
			}
		}
	}
	return false
}
// https://github.com/kubernetes/kubernetes/blob/af0b4c9031bd26aa5ce6b2ef4fc66cae14e183dc/pkg/kubelet/eviction/eviction_manager.go#L527
```

소스코드에서 위에서 알아보았던 container log 와 rootfs 를 합산하는 모습이 보이네요. (`diskUsage(containerStat.Logs)`, `diskUsage(containerStat.Rootfs)`)

### podEphemeralStorageLimitEviction

`podEphemeralStorageLimitEviction` 은 하나의 Pod 에 대한 Ephemeral Storage 사용량을 측정하고,
Pod Limit 이상으로 사용되고 있다면 해당 Pod 을 Eviction 시킵니다.

위에서 Container Spec 으로 리소스의 Limit / Request 을 결정할 수 있었는데요,
아래 yaml 과 같이 Pod 에는 리소스를 제한할 수 있는 스펙이 없습니다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend
spec:
  containers:
    - name: app
      image: images.my-company.example/app:v4
      resources:
        requests:
          ephemeral-storage: "2Gi"
        limits:
          ephemeral-storage: "4Gi"
    - name: log-aggregator
      image: images.my-company.example/log-aggregator:v6
      resources:
        requests:
          ephemeral-storage: "2Gi"
        limits:
          ephemeral-storage: "4Gi"
```

그렇다면 Pod 의 Ephemeral Storage 제한은 어떻게 결정될까요?
간단하게 생각하면 Pod 스펙 내 컨테이너의 Ephemeral Storage 제한을 모두 더한 값으로 결정할 수 있을 것 같지만,
Pod 스펙에는 `initContainers` 라는 초기화 컨테이너 스펙이 추가될 수 있다는 점을 생각하면 또 헷갈리기 시작합니다.

> 제가 이 포스트를 써보기로 한 이유이기도 합니다.

Pod 의 Resource 제한이 어떻게 계산되는지 알아보기 위해 코드를 살펴보도록 하겠습니다.

```go
func (m *managerImpl) podEphemeralStorageLimitEviction(podStats statsapi.PodStats, pod *v1.Pod) bool {
	_, podLimits := apiv1resource.PodRequestsAndLimits(pod)
    ...
}
// https://github.com/kubernetes/kubernetes/blob/af0b4c9031bd26aa5ce6b2ef4fc66cae14e183dc/pkg/kubelet/eviction/eviction_manager.go#L503

func PodRequestsAndLimitsReuse(pod *v1.Pod, reuseReqs, reuseLimits v1.ResourceList) (reqs, limits v1.ResourceList) {
	// attempt to reuse the maps if passed, or allocate otherwise
	reqs, limits = reuseOrClearResourceList(reuseReqs), reuseOrClearResourceList(reuseLimits)

	for _, container := range pod.Spec.Containers {
		addResourceList(reqs, container.Resources.Requests)
		addResourceList(limits, container.Resources.Limits)
	}
	// init containers define the minimum of any resource
	for _, container := range pod.Spec.InitContainers {
		maxResourceList(reqs, container.Resources.Requests)
		maxResourceList(limits, container.Resources.Limits)
	}

	// if PodOverhead feature is supported, add overhead for running a pod
	// to the sum of requests and to non-zero limits:
	if pod.Spec.Overhead != nil && utilfeature.DefaultFeatureGate.Enabled(features.PodOverhead) {
    ...
}

// https://github.com/kubernetes/kubernetes/blob/264496cc4166d841a4c278fe096d6dd29e8f836a/pkg/api/v1/resource/helpers.go#L44
```

`podEphemeralStorageLimitEviction` 함수에서 Pod Limit 을 가져오기 위해 `PodRequestsAndLimits` 함수를 호출합니다.
`PodRequestsAndLimits` 함수는 `PodRequestsAndLimitsReuse` 를 호출하고, 이 함수는 다음과 같은 절차로 Pod 의 리소스 제한을 계산하게 됩니다.

1. `Pod.Spec.Containers` 스펙 내의 컨테이너들을 순회하며 Requests, Limits 들을 결과에 합산
2. `Pod.Spec.InitContainers` 스펙 내의 컨테이너들을 순회하며 이 Requests, Limits 값이 `1.` 에서 합산된 값보다 크면 대체

정리하자면, Pod 의 리소스 제한은 다음과 같이 결정됩니다.

max(`Pod.Spec.Containers 컨테이너들의 리소스 Limit 합`, `Pod.Spec.InitContainers 컨테이너 각각의 리소스 Limit`)

> Spec.Overhead 스펙은 해당 포스트에서 생략합니다.

Pod Ephemeral Storage 의 Limit 을 계산하는 방법은 알아 냈습니다. 그렇다면 Pod 의 Ephemeral Storage 사용량은 어떻게 측정될까요?
`containerEphemeralStorageLimitEviction` 와는 다르게, `podEphemeralStorageLimitEviction` 은 local ephemeral volume 을 포함해 ephemeral storage 사용량을 측정합니다. local ephemeral volume 은 host 의 스토리지 영역을 사용하는 볼륨을 뜻하며, local ephemeral volume 의 여부는 아래와 같이 판단됩니다.

```go
// IsLocalEphemeralVolume determines whether the argument is a local ephemeral
// volume vs. some other type
// Local means the volume is using storage from the local disk that is managed by kubelet.
// Ephemeral means the lifecycle of the volume is the same as the Pod.
func IsLocalEphemeralVolume(volume v1.Volume) bool {
	return volume.GitRepo != nil ||
		(volume.EmptyDir != nil && volume.EmptyDir.Medium == v1.StorageMediumDefault) ||
		volume.ConfigMap != nil
}
// https://github.com/kubernetes/kubernetes/blob/fe7a862c2d14bf6f9aff92f11338ede0d3e1a9a1/pkg/volume/util/util.go#L588
```

- GitRepo
- Emptydir Medium 이 Default("") 인 Emptydir
- ConfigMap

위 세개의 리소스가 Local Ephemeral Volume 사용량에 합산되어 계산됩니다.

## Pod Eviction 테스트

이제 우리는 Kubernetes 에서 Ephemeral Storage Limit 을 어떻게 계산하는지까지 알아보았습니다.  
분석한 내용대로 Pod 이 Eviction 되는지 테스트해 보겠습니다.

### emptydir eviction

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: emptydir-eviction
spec:
  securityContext:
    runAsUser: 0
  containers:
    - name: nginx
      image: nginx:1.14.2
      volumeMounts:
        - name: emptydir
          mountPath: /emptydir
  volumes:
    - name: emptydir
      emptyDir:
        sizeLimit: 1Gi
```

Emptydir Eviction 을 테스트 하기 위해 위와 같은 스펙으로 Pod 을 생성했습니다.

- emptydir 볼륨을 `sizeLimit: 1Gi` 로 추가
- 해당 볼륨을 컨테이너 내 `/emptydir` 디렉토리에 마운트

```bash
$ k exec -it emptydir-eviction bash
[root@emptydir-eviction nginx-1.14.2]# cd /emptydir/
[root@emptydir-eviction emptydir]# for i in {1..3}; do echo $i; dd if=/dev/zero of=$i bs=1MB count=500; sleep 20; done
1
500+0 records in
500+0 records out
500000000 bytes (500 MB) copied, 0.274682 s, 1.8 GB/s
2
500+0 records in
500+0 records out
500000000 bytes (500 MB) copied, 0.269753 s, 1.9 GB/s
3
500+0 records in
500+0 records out
500000000 bytes (500 MB) copied, 0.257411 s, 1.9 GB/s
[root@emptydir-eviction emptydir]# command terminated with exit code 137
```

컨테이너에 접근하여 수동으로 `/emptydir` 디렉토리에 데이터를 넣어 보겠습니다.
실행한 스크립트는 500MB 파일을 디렉토리에 20초 간격으로 3번 Write 하게 됩니다.

```
Warning  Evicted    2s     kubelet, xxxxxx  Usage of EmptyDir volume "emptydir" exceeds the limit "1Gi".
```

Write 가 끝난 후 `/emptydir` 디렉토리에는 1.5GB 의 파일이 쌓여 있을 것이고, 이는 우리가 설정한 emptydir sizeLimit 인 1Gi 보다 크기 때문에
위와 같은 로그를 남기며 Pod 이 Evict 되는 모습을 보실 수 있습니다.

> Evict 시점은 Kubelet 의 사용량 확인 시점에 따라 다를 수 있습니다.

### container ephemeral storage limit eviction

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: container-ephemeral-storage-eviction
spec:
  securityContext:
    runAsUser: 0
  containers:
    - name: nginx
      image: nginx:1.14.2
      resources:
        limits:
          ephemeral-storage: 500Mi
    - name: app
      image: busybox
      resources:
        limits:
          ephemeral-storage: 500Mi
```

다음은 container ephemeral storage limit 스펙에 따른 eviction 을 테스트 해보기 위해서 위와 같은 스펙으로 Pod 을 띄워 보겠습니다.
컨테이너 스펙으로 각각 `ephemeral-storage` 제한을 `500Mi` 로 설정하고, 두개의 컨테이너를 띄웁니다.

이렇게 되면 각각의 컨테이너의 리소스 제한은 500Mi 가 되고, Pod Ephemeral Storage 제한은 두 컨테이너 (nginx, app) 제한의 합인 1Gi 가 됩니다.
이 중 한 컨테이너에 접근해서 1.5GB 파일을 Write 해봅니다.

```bash
$ k exec -it container-ephemeral-storage-eviction -c nginx bash
[root@container-ephemeral-storage-eviction nginx-1.14.2]# for i in {1..3}; do echo $i; dd if=/dev/zero of=$i bs=1MB count=500; sleep 20; done
1
500+0 records in
500+0 records out
500000000 bytes (500 MB) copied, 0.271112 s, 1.8 GB/s
2
500+0 records in
500+0 records out
500000000 bytes (500 MB) copied, 0.261845 s, 1.9 GB/s
3
500+0 records in
500+0 records out
500000000 bytes (500 MB) copied, 0.280843 s, 1.8 GB/s
command terminated with exit code 137
```

```
Warning  Evicted    15s   kubelet, xxxxxx  Container nginx exceeded its local ephemeral storage limit "500Mi".
```

pod describe 를 통해 확인해보면, container ephemeral storage limit 에러로 Evict 되었다는 것을 확인할 수 있습니다.
컨테이너 Ephemeral Storage 제한인 500Mi 에 걸려 Evict 되었다는 것을 알 수 있네요.

### pod ephemeral storage limit eviction

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-ephemeral-storage-eviction
spec:
  securityContext:
    runAsUser: 0
  initContainers:
    - name: centos
      image: centos:7
      command: ["sh", "-c", "sleep 10"]
      resources:
        limits:
          ephemeral-storage: 2Gi
  containers:
    - name: nginx
      image: nginx:1.14.2
      resources:
        limits:
          ephemeral-storage: 500Mi
      volumeMounts:
        - name: emptydir
          mountPath: /emptydir
    - name: app
      image: busybox
      resources:
        limits:
          ephemeral-storage: 500Mi
      volumeMounts:
        - name: emptydir
          mountPath: /emptydir
  volumes:
    - name: emptydir
      emptyDir: {}
```

마지막으로, Pod 에 대한 ephemeral storage limit eviction 을 테스트 해보겠습니다.  
위와 같은 스펙으로 Pod 을 작성 시, Pod Limit 은 어떻게 될까요?

max(`Pod.Spec.Containers 컨테이너들의 리소스 Limit 합`, `Pod.Spec.InitContainers 컨테이너 각각의 리소스 Limit`)

containers 내의 리소스 Limit 합은 1Gi (500Mi + 500Mi) 이지만 initContainers 에 있는 centos 컨테이너의 Limit 이 2Gi 이므로
더 큰 2Gi 가 Pod 의 리소스 제한이 됩니다.
그리고 각 컨테이너들은 `/emptydir` 위치에 `sizeLimit` 이 없는 emptydir 을 마운트합니다.
pod limit 사용량에는 default type emptydir 사용량이 합산되므로, emptydir 이 마운트된 위치에 파일을 Write 해보면서 테스트 해볼 수 있을 것 같습니다.

아래와 같이 두 케이스로 두고 테스트를 진행해 보겠습니다.

1. Pod 리소스 제한(2Gi)을 넘지 않도록 `/emptydir` 경로에 Write (1.5GB)
2. Pod 리소스 제한(2Gi)을 넘도록 `/emptydir` 경로에 Write (2.5GB)

```bash
$ k exec -it pod-ephemeral-storage-eviction -c nginx bash
[root@pod-ephemeral-storage-eviction nginx-1.14.2]# cd /emptydir/
[root@pod-ephemeral-storage-eviction emptydir]# for i in {1..3}; do echo $i; dd if=/dev/zero of=$i bs=1MB count=500; sleep 20; done
1
500+0 records in
500+0 records out
500000000 bytes (500 MB) copied, 0.271969 s, 1.8 GB/s
2
500+0 records in
500+0 records out
500000000 bytes (500 MB) copied, 0.271598 s, 1.8 GB/s
3
500+0 records in
500+0 records out
500000000 bytes (500 MB) copied, 0.262356 s, 1.9 GB/s
```

1.5GB 파일을 `/emptydir` 경로에 Write 시 Pod Evict 가 일어나지 않았습니다. Pod Limit 제한이 2Gi 이기 때문이죠.
이제 500MB 파일을 두개 더 생성하여 emptydir 사용량이 2.5GB 가 되도록 해보겠습니다.

```bash
[root@pod-ephemeral-storage-eviction emptydir]# for i in {4..5}; do echo $i; dd if=/dev/zero of=$i bs=1MB count=500; sleep 20; done
4
500+0 records in
500+0 records out
500000000 bytes (500 MB) copied, 0.266805 s, 1.9 GB/s
5
500+0 records in
500+0 records out
500000000 bytes (500 MB) copied, 0.266405 s, 1.9 GB/s
[root@pod-ephemeral-storage-eviction emptydir]# command terminated with exit code 137
```

예상했던대로 Pod Limit 인 2Gi 를 넘어서니 (2.5GB) Evict 가 되었습니다.

```
Warning  Evicted    69s    kubelet, xxxxxx  Pod ephemeral local storage usage exceeds the total limit of containers 2Gi.
```

로그 상으로도 initContainers 의 최대 Limit 인 2Gi 로 Limit 이 결정된 것을 확인할 수 있습니다.

## 마치며

이 포스트는 Container Ephemeral Limit 을 설정했는데, Evict 된 Pod Description 로그에는 Limit 이 예상한 대로 나오지 않는다는 사용자 제보로 조사하다가, 좀 더 알아보고 싶은 생각에 작성하게 되었습니다.

`코드 안에 답이 있다`라는 말이 실감나는 좋은 경험이었던 것 같습니다.

Ephemeral Storage 리소스에 대해 좀 더 알아보고 싶었던 분들에게 도움이 되었으면 합니다.
