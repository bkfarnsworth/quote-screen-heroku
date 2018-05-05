const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

console.log('process.env.EVERNOTE_API_CONSUMER_SECRET: ', process.env.EVERNOTE_API_CONSUMER_SECRET);

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));
