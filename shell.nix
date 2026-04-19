{
  pkgs ? import <nixpkgs> { },
}:
with pkgs;
mkShell {
  packages = [
    nixd
    nixfmt-rfc-style
    nodejs_24
    corepack_24

    # For better-sqlite3
    python315
  ];

  shellHook = ''
    ${corepack_24}/bin/pnpm install --frozen-lockfile
  '';
}
