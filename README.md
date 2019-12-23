# Reveal Quiz

## Quizzing

```
reveal-quiz [options] <fileOrDir>

Read file or directory or in the editor

Positionals:
  fileOrDir  Path to the file or directory to read

Options:
  --help      Show help                                                [boolean]
  --version   Show version number                                      [boolean]
  --port, -p  Port to run the server                   [number] [default: 24000]
  --no-open   Do not open the browser after running the server         [boolean]
```

## Editor

```
reveal-editor [options] <fileOrDir>

Read file or directory or in the editor

Positionals:
  fileOrDir  Path to the file or directory to read

Options:
  --help      Show help                                                [boolean]
  --version   Show version number                                      [boolean]
  --port, -p  Port to run the server                   [number] [default: 24000]
  --no-open   Do not open the browser after running the server         [boolean]
```

## Installation

```
git clone https://github.com/patarapolw/reveal-quiz.git
cd reveal-quiz
yarn
yarn prepack
cd packages/editor && yarn link && cd -
cd packages/quiz && yarn link && cd -
```

Now you can use `yarn link @reveal-quiz/editor` and `yarn link @reveal-quiz/quiz` anywhere.

## Example repo

See <https://github.com/patarapolw/zhsrs>
