FROM node:22
WORKDIR /usr/src/app
COPY package*.json .
RUN npm install
RUN npx update-browserslist-db@latest
COPY . .
EXPOSE 1234
CMD ["npm", "run", "dev"]