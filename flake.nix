{
  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem
    (system: let
      pkgs = import nixpkgs {
        inherit system;
      };
    in {
      devShells.default = pkgs.mkShell {
        buildInputs = [
          pkgs.nodejs_20
          pkgs.nodePackages.pnpm
        ];

        shellHook = ''
          export PS1="[dev] $PS1"
          export PATH=$PWD/node_modules/.bin:$PATH

          [[ -f .env ]] && source .env
        '';
      };
    });
}
