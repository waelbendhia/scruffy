# by default nix uses channel that can be different form setup to setup
# pin package tree to ensure every machine has the same outcome
## replace commit_sha
## nix-prefetch-url --unpack https://github.com/NixOS/nixpkgs/archive/8440538f883be7606e1c16cf5aa915d9272fde1c.tar.gz
{ pkgs ? import <nixpkgs> { } }:
with pkgs; mkShell {

  # dependencies
  buildInputs =
    let
      tygo = buildGoModule
        rec {
          pname = "tygo";
          version = "0.2.13";

          src = fetchFromGitHub {
            owner = "gzuidhof";
            repo = "tygo";
            rev = "v${version}";
            sha256 = "sha256-oJS+RDzXZMnUxacgi2mC4C7PMdJbTbaO9x8JDuT8G88=";
          };

          vendorHash = "sha256-Suwo9xyj34IEBqu328EEl8GCS9QthFWnSKlU4gRUMAU=";

          meta = with lib; {
            description = "Tygo is a tool for generating Typescript typings from Golang source files that just works.";
            homepage = "https://github.com/gzuidhof/tygo";
            license = licenses.mit;
          };
        };
    in
    [
      coreutils # GNU
      bash
      openssl
      nodejs_18

      tygo

      sqlc
      watchexec
    ];

  PRISMA_SCHEMA_ENGINE_BINARY = "${prisma-engines}/bin/schema-engine";
  PRISMA_QUERY_ENGINE_BINARY = "${prisma-engines}/bin/query-engine";
  PRISMA_QUERY_ENGINE_LIBRARY = "${prisma-engines}/lib/libquery_engine.node";
  PRISMA_FMT_BINARY = "${prisma-engines}/bin/prisma-fmt";
  LD_LIBRARY_PATH = "${libuuid.lib}/lib";

  shellHook = /* fish */ ''
    set -a
    source .env
    set +api
  '';
}
