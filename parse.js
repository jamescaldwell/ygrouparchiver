'use strict';

const Mbox = require('node-mbox');
const MailParser  = require('mailparser').MailParser;
const simpleParser = require('mailparser').simpleParser;
const async = require('async')

const mbox = new Mbox('../sharktankgroup/50795.mbox.00001', {  });

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
