# Japanese Conjugation Practice
A web app for practicing Japanese verb and adjective conjugations with basic spaced repition. URL: http://baileysnyder.com/jconj/

## Build Setup
```bash
# install dependencies
$ npm install

# serve with hot reload at localhost:1234
$ npm run dev

# build for production
# minifies and outputs into /dist
$ npm run build
```

## Build Setup Without Node.js Installation
For VSCode users, the `.devcontainer/devcontainer.json` file allows the project to be opened in a Docker container so that installation of Node.js locally is not required. The container supports hot reload and debugging support via the debug launch targets defined in the `.vscode/launch.json` file.

## Deployment to Github Pages
The .github/workflows/publish-site.yml file provides a Github workflow to automatically deploy to the  project's GitHub Pages site.