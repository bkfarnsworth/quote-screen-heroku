var Evernote = require('evernote');
var enml = require('enml-js');

var PORT = process.env.PORT || 5000;

var callbackUrl = "http://localhost:" + PORT + "/oauth_callback";
var token = process.env.EVERNOTE_PROD_TOKEN;
var API_CONSUMER_KEY = process.env.EVERNOTE_API_CONSUMER_KEY;
var API_CONSUMER_SECRET = process.env.EVERNOTE_API_CONSUMER_SECRET;
var CHINA = false;
var SANDBOX = false;


// home page
exports.index = function(req, res) {

   if(!token) {
      throw new Error('You forgot to put the token in');
   }

   var client = new Evernote.Client({
      token: token,
      sandbox: SANDBOX,
      china: CHINA
   });

   var noteStore = client.getNoteStore();
   var filter = new Evernote.NoteStore.NoteFilter()
   filter.order = Evernote.Types.NoteSortOrder.CREATED;
   filter.notebookGuid = "a5c3eeeb-72d4-41b0-8621-08d7a00d3adb"//guid for the reminders notebook

   var spec = Evernote.NoteStore.NotesMetadataResultSpec({
      includeTitle: true,
      includeContentLength: false,
      includeNotebookGuid: true,
      includeAttributes: true,
      includeLargestResourceMime: true,
      includeLargestResourceSize: true,
   });

   //just get the metaData for the first note so we can get the total number of notes
   noteStore.findNotesMetadata(filter, 0, 1, spec).then(function(notesMetadataList) {

      //now get a random number between 0 and the total number of notes      
      var totalNotes = notesMetadataList.totalNotes;
      var randomNumber = getRandomInt(0, totalNotes);

      //now get the meta data for the note of that random number
      noteStore.findNotesMetadata(filter, randomNumber, randomNumber + 1, spec).then(list => {

         //get the note with it's content
         var notes = list.notes;
         var note = notes[0];
         if(note) {
            var noteResultSpec = new Evernote.NoteStore.NoteResultSpec({
               includeContent: true
            });

            noteStore.getNoteWithResultSpec(note.guid, noteResultSpec).then(wholeNote => {

               //get the html and render
               var content = wholeNote.content;
               var html = enml.HTMLOfENML(content);
               req.session.quote = html;
               res.render('index', {session: req.session});

               //for debugging, the content looks like this:
               // <?xml version="1.0" encoding="UTF-8" standalone="no"?>
               // <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
               // <en-note><div>&quot;Clarification chain&quot;</div><div><br/></div><div>'If it matters at all, it is detectable/observable'</div><div>If it is is detectable, it can be detected as an amount (or a range of possible amounts)</div><div>If it can be detected as a range of possible amounts, it is measurable</div><div><br/></div></en-note>
            });
         }
      })
   }, function(error){
      console.log('error: ', error);
      req.session.error = error.rateLimitDuration ? 'Rate Limit Error: ' + error.rateLimitDuration : 'Check server output for error';
      res.render('index', {session: req.session});
   });
};

// OAuth
exports.oauth = function(req, res) {
   var client = new Evernote.Client({
      consumerKey: API_CONSUMER_KEY,
      consumerSecret: API_CONSUMER_SECRET,
      sandbox: SANDBOX,
      china: CHINA
   });

   client.getRequestToken(callbackUrl, function(error, oauthToken, oauthTokenSecret, results) {
      if (error) {
         req.session.error = JSON.stringify(error);
         res.redirect('/');
      } else {
         // store the tokens in the session
         req.session.oauthToken = oauthToken;
         req.session.oauthTokenSecret = oauthTokenSecret;

         // redirect the user to authorize the token
         res.redirect(client.getAuthorizeUrl(oauthToken));
      }
   });
};

// OAuth callback
exports.oauth_callback = function(req, res) {
   var client = new Evernote.Client({
      consumerKey: API_CONSUMER_KEY,
      consumerSecret: API_CONSUMER_SECRET,
      sandbox: SANDBOX,
      china: CHINA
   });

   client.getAccessToken(
      req.session.oauthToken, 
      req.session.oauthTokenSecret, 
      req.query.oauth_verifier,
      function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
         if (error) {
            console.log('error');
            console.log(error);
            res.redirect('/');
         } else {
            // store the access token in the session
            req.session.oauthAccessToken = oauthAccessToken;
            req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
            req.session.edamShard = results.edam_shard;
            req.session.edamUserId = results.edam_userId;
            req.session.edamExpires = results.edam_expires;
            req.session.edamNoteStoreUrl = results.edam_noteStoreUrl;
            req.session.edamWebApiUrlPrefix = results.edam_webApiUrlPrefix;
            res.redirect('/');
         }
   });
};

// Clear session
exports.clear = function(req, res) {
   req.session.destroy();
   res.redirect('/');
};


// This example returns a random integer between the specified values. The value is no lower than min (or the next integer greater than min if min isn't an integer), and is less than (but not equal to) max.
function getRandomInt(min, max) {
   min = Math.ceil(min);
   max = Math.floor(max);
   return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
