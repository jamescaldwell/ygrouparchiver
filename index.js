const program = require('commander');
const fs = require('fs');
const path = require('path');
const MailParser  = require('mailparser').MailParser;
const assert     = require('assert');
//const { expect } = require('chai');
//const through2   = require('through2');
const simpleParser = require('mailparser').simpleParser;
const mysql      = require('mysql');

program.version('1.0.0');
program.option("-p, --path <path>", "Input path (file or directory)", "./mbox")
       .option("-c, --config <config>", "Config file", "./config/config.json")
       .usage("[global options]")
       .parse(process.argv);

console.log("Welcome to Yahoo Group Archive to WebView");
console.log("  Input path:" + program.path);
console.log("  Config file:" + program.config);

// load config file
try {
    var stat = fs.statSync(program.config)
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
}
let rawdata = fs.readFileSync(program.config);
let config = JSON.parse(rawdata);

// add single file or all files in directory in filesCollection array
let isPathDirectory = true;
try {
    isPathDirectory = fs.statSync(program.path).isDirectory();
} catch (e) {
  console.error(e);
} finally {
}

var filesCollection = [];
if (isPathDirectory) {
   readDirectorySynchronously(program.path);
} else {
   filesCollection.push(program.path); // add single file
}


function readDirectorySynchronously(directory) {
    var currentDirectory = fs.readdirSync(directory, 'utf8');

    currentDirectory.forEach(file => {
//        var fileShouldBeSkipped = directoriesToSkip.indexOf(file) > -1;
        var pathOfCurrentItem = path.join(directory + '/' + file);
        if (/*!fileShouldBeSkipped && */ fs.statSync(pathOfCurrentItem).isFile()) {
            filesCollection.push(pathOfCurrentItem);
        }
        else {  //} if (!fileShouldBeSkipped) {
            var directorypath = path.join(directory + '/' + file);
            readDirectorySynchronously(directorypath);
        }
    });
}

console.log(config);

console.log("Connect to db...");
// open database connection
var connection = mysql.createConnection({
  host     : config.db_host,
  user     : config.db_user,
  password : config.db_password,
});

connection.connect(function(err) {
  if (err) {
    console.error('error connecting to database: ' + err.stack);
    process.exit(1);
  }
  console.log('connected as id ' + connection.threadId);
});


// now time to parse each input file into
/*

const Mbox       = require('./src/mbox');

const mbox = new Mbox('50795.mbox.00001', {  });

console.log(simpleParser);

mbox.on('message', function(msg) {
	// msg is a buffer instance
//	console.log("Msg->", msg.headers.keys()());
	let opts = {formatDateString: date => date.toUTCString()};
	simpleParser(msg, opts, (err, mail) => {
		if (mail)
		{
			//mail.headers.forEach(dispHeaders);
			if (mail.headers.has('subject'))
			{
				console.log("Subject: " + mail.headers.get('subject'));
			}
			if (mail.headers.has('from'))
			{
				var from = mail.headers.get('from').value[0];
				console.log("From: " + from.name + " <" + from.address + ">");
			}
			if (mail.headers.has('date'))
			{
				console.log("Date: " + mail.date);
			}
//Message-ID: <50795.1.24.959281621@eGroups.com>
// format is groupid.digestNum.messageNum.relayNum
			if (mail.messageId)
			{
				var mids = mail.messageId.split(".");
				var messageNum = mids[2];
				console.log("Msg #: " + messageNum);
			}
			if (mail.html)
			{
				console.log("HTML:" + mail.html);
			}
			else if (mail.text)
			{
		//		console.log("TEXT:" + mail.text);
			}

			console.log ("==============================");
		}
		else if (err)
		{
			console.log("****Message not parsed****");
		}
	});
});

mbox.on('error', function(err) {
	console.log('Err->', err);
});

mbox.on('end', function() {
	console.log('We are done-----------------------');
});

function dispHeaders(value, key, map) {
	console.log("  " + key + "=" + value);
}

*/


connection.end();
