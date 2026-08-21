{
  description = "sungjunyoung blog — Astro static site";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          name = "sungjunyoung-blog";

          packages = with pkgs; [
            nodejs_26
            pnpm
            prettier
          ];

          shellHook = ''
            echo "sungjunyoung blog — node $(node --version), pnpm $(pnpm --version)"
            echo "  pnpm install    install dependencies"
            echo "  pnpm dev        start dev server on http://localhost:4321"
            echo "  pnpm build      build to ./dist"
          '';
        };
      });

      formatter = forAllSystems (pkgs: pkgs.nixfmt-tree);
    };
}
