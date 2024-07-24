{ pkgs, lib, config, inputs, ... }:

{
  languages.javascript.enable = true;

  # https://devenv.sh/packages/
  packages = [ pkgs.bun pkgs.k6 pkgs.awscli2 pkgs.ansible ];

  # https://devenv.sh/scripts/
  scripts.hello.exec = "k6";

  # https://devenv.sh/tests/
  enterTest = ''
    echo "Running tests"
    git --version | grep "2.42.0"
  '';

  # https://devenv.sh/pre-commit-hooks/
  # pre-commit.hooks.shellcheck.enable = true;

  # https://devenv.sh/processes/
  # processes.ping.exec = "ping example.com";

  # See full reference at https://devenv.sh/reference/options/
}
