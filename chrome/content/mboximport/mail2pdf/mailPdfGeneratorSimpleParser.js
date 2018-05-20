/*******************************************************************************
 * mailArchiver_ATD LICENSE************************
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 Claude Fauconnet claude.fauconnet@neuf.fr
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 ******************************************************************************/

var fs = require('fs')
var modulesDir='../../../../nodeJS/node_modules/'
var PDFDocument = require(modulesDir+'pdfkit');
var path = require('path');
var mailProcessor = require('./myMailProcessor.js');
var common = require('./common.js');

var addMetaData=false;


var mailPdfGenerator = {
    pdfDir: "pdfArchives",
    maxPdfSubjectLength: 33,
    addMetaData: true
    ,

    createMailPdf: function (mail, pdfDir, pdfDirRelativePath, sender, senderDirDate, callback) {
        try {
            sender = mailPdfGenerator.formatStringForArchive(sender, 30);

            if (mail.html)
                mail.html = mailPdfGenerator.removeHtmlTags(mail.html);
            if (mail.text)
                mail.text = mailPdfGenerator.removeHtmlTags(mail.text);


            var dirs = pdfDirRelativePath.split(path.sep);
          //  var sbdFileName = common.toAscii(common.truncate(dirs[dirs.length - 1], common.maxDirLength));
           // dirs[dirs.length - 1] = sbdFileName;
            dirs.splice(0, 0,sender, senderDirDate)
            var parentDirPath = pdfDir;
            var relativeFolderPath = "";//pdfDir;//+"/"+sender+"/"+senderDirDate;
            for (var i = 0; i < dirs.length; i++) {
                parentDirPath += "/" + dirs[i].replace(".sbd", "");
                relativeFolderPath += "/" + dirs[i].replace(".sbd", "")
                var dir = path.resolve(parentDirPath)
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir);
                }
            }


            //    var pdfFileName = mail.date.toString('yyyy-MM-dd');
            //   var index = Math.round(Math.random() * 10000)

            var mailTitle;
            if (mail.subject)
                mailTitle = mail.subject;
            else
                mailTitle = "mail_sans_sujet_" + Math.round(Math.random() * 1000000);
            var pdfFileName = mailTitle;
            mailTitle = mailPdfGenerator.formatStringForArchive(mailTitle, mailPdfGenerator.maxPdfSubjectLength);

            mailTitle = mailPdfGenerator.removeMultipleReAndFwdInTitle(mailTitle);
            pdfFileName = common.dateToString(mail.date) + "-" + mailTitle + ".pdf";
            pdfFileName = mailPdfGenerator.processDuplicateMailTitles(parentDirPath, pdfFileName);


            var attachments = [];
            if (mail.attachments) {
                for (var i = 0; i < mail.attachments.length > 0; i++) {
                    if (mail.attachments[i].filename) {
                        //  archiveProcessor.consoleToFile(mail.attachments[i].name)
                        //    var id = mail.attachments[i].contentId;

                        var attachmentName = mailPdfGenerator.processAttachment(mail.attachments[i], parentDirPath, pdfFileName);
                        attachments.push(attachmentName);//"<a href='attachments/"+attachmentName+"'>"+mail.attachments[i].filename + "</a>\n";
                    }
                }
            }


            var doc = new PDFDocument
            doc.pipe(fs.createWriteStream(path.resolve(parentDirPath + "/" + pdfFileName)));


            var fontSize = {
                title: 12,
                text: 10,
                small: 8
            }
            var textWidth = 500


            //metadata
            if (addMetaData) {
                if (mail.subject)
                    doc.info.Title = mail.subject;
                if (mail.from)
                    doc.info.Author = mail.from.text;
                if (mail.date)
                    doc.info.CreationDate = mail.date;


                //  doc.info.Keywords=""+mail.subject+","+mail.from.text+","+mail.to.text


            }


            doc.fontSize(fontSize.title)
            doc.text('MessageId : ', {width: textWidth, align: 'left'})
            doc.fontSize(fontSize.text)
            doc.text(mail.messageId, {width: textWidth, align: 'left'})
            // doc.text(mail.headers["Message-ID"], {width: textWidth, align: 'left'})


            doc.fontSize(fontSize.title)
            doc.text('From : ', {width: textWidth, align: 'left'})
            doc.fontSize(fontSize.text)
            if (mail.from)
                doc.text(mail.from.text, {width: textWidth, align: 'left'})

            doc.moveDown(0.5)
            doc.fontSize(fontSize.title)
            doc.text('To : ', {width: textWidth, align: 'left'})
            doc.fontSize(fontSize.text)
            if (mail.to)
                doc.text(mail.to.text, {width: textWidth, align: 'left'})


            doc.moveDown(0.5)
            doc.fontSize(fontSize.title)
            doc.text('replyTo : ', {width: textWidth, align: 'left'})
            doc.fontSize(fontSize.text)
            if (mail.replyTo)
                doc.text(mail.replyTo.text, {width: textWidth, align: 'left'})

            if (mail.cc && mail.cc.value.length > 0) {
                doc.moveDown(0.5)
                doc.fontSize(fontSize.title)
                //  doc.fontcolor("red")
                doc.text('cc : ', {width: textWidth, align: 'left'})
                doc.fontSize(fontSize.text)
                for (var i = 0; i < mail.cc.value.length; i++) {
                    doc.text(mail.cc.value[i].address + "\n", {width: textWidth, align: 'left'})
                }

            }
            if (mail.cci && mail.cci.value.length > 0) {
                doc.moveDown(0.5)
                doc.fontSize(fontSize.title)
                //  doc.fontcolor("red")
                doc.text('cci : ', {width: textWidth, align: 'left'})
                doc.fontSize(fontSize.text)
                for (var i = 0; i < mail.cci.value.length; i++) {
                    doc.text(mail.cci.value[i].address + "\n", {width: textWidth, align: 'left'})
                }

            }

            doc.moveDown(0.5)
            doc.fontSize(fontSize.title)
            doc.text('Date : ', {width: textWidth, align: 'left'})
            doc.fontSize(fontSize.text)
            doc.text(mail.date, {width: textWidth, align: 'left'})

            doc.moveDown(0.5)
            doc.fontSize(fontSize.title)
            doc.text('Subject : ', {width: textWidth, align: 'left'})
            doc.fontSize(fontSize.text)
            doc.text(mail.subject, {width: textWidth, align: 'left'})


            if (attachments.length > 0) {
                doc.fontSize(fontSize.title)
                doc.text('Attachments removed : ', {width: textWidth, align: 'left'})
                doc.moveDown(0.5)
                for (var i = 0; i < attachments.length; i++) {

                    doc.moveDown(0.5)
                    doc.underline(20, 0, 100, 20, 'blue')
                        .link(20, 0, 100, 20, './attachments/' + attachments[i])
                    //  doc.fontcolor("red")
                    doc.fontSize(fontSize.text)
                    if (attachments[i].substring)
                        doc.text(attachments[i].substring(attachments[i].indexOf("__" + 2)), {
                            width: textWidth,
                            align: 'left'
                        })
                }


            }
            /*  if (mail.references && mail.references.length > 0) {
                  doc.moveDown(0.5)
                  doc.fontSize(fontSize.title)
                  //  doc.fontcolor("red")
                  doc.text('References : ', {width: textWidth, align: 'left'})
                  doc.fontSize(fontSize.small)
                  for (var i = 0; i < mail.references.length; i++) {
                      doc.text(mail.references[i] + "\n", {width: textWidth, align: 'left'})
                  }

              }*/


            doc.moveDown(0.5)
            doc.fontSize(fontSize.title)
            doc.text('text : ', {width: textWidth, align: 'left'})
            doc.fontSize(fontSize.small)
            if (mail.text)
                doc.text(mail.text, {width: textWidth, align: 'left'})
            else if (mail.html)
                doc.text(mail.html, {width: textWidth, align: 'left'})
            else if (mail.textAsHtml)
                doc.text(mail.textAsHtml, {width: textWidth, align: 'left'})


            doc.end();
           // archiveProcessor.totalPdfSaved += 1
            return callback(null, {path: relativeFolderPath, file: pdfFileName});
        }
        catch (e) {
            console.log(e)
            //    mailProcessor.log("!! pdf exception " + e)
            callback(e)
        }
    },
    formatStringForArchive: function (str, maxLength) {
        str = common.toAscii(common.truncate(str, maxLength));
        str = str.replace(/ /g, "_");
        str = common.replaceNonLetterOrNumberChars(str, "");
        str = str.replace(/_/g, "-");
        return str;
    },
    removeMultipleReAndFwdInTitle: function (str) {
        var re = /Re[-_:]/gi
        var fwd = /Fwd[-_:]/gi;
        var str0 = str;

        var reArray = str.match(re);
        if (reArray && reArray.length > 1) {
            //  str = "Re-" + reArray.length + "-" + str.replace(re, "");
            str = str.replace(re, "") + "-Re-" + reArray.length;
        }
        else if (reArray && reArray.length == 1) {// on met Re_ en fin
            str = str.replace(re, "") + "-Re"
        }
        var fwdArray = str0.match(fwd);
        if (fwdArray && fwdArray.length > 1) {

            str = str.replace(re, "") + "-Fwd-" + fwdArray.length;
        }
        else if (reArray && reArray.length == 1) {// on met Re_ en fin
            str = str.replace(re, "") + "-Fwd"
        }
        return str;
    }, removeHtmlTags: function (str) {
        str = str.replace(/<\/p>/gi, "\n");
        str = str.replace(/<BR>/gi, "\n");
        str = str.replace(/<[^>]*>/gi, "");

        //specific CF
        str = str.replace(/&nbsp;/gi, "");
        str = str.replace(/@import.*/gi, "");
        str = str.replace(/[™•]+.*/gm, "");

        str = str.replace(/[\r]+.*/gm, "");


        return str;
    }, processDuplicateMailTitles: function (parentDirPath, pdfFileName) {
        var i = 0;
        var isDuplicate = false
        var prefix = ""
        do {
            isDuplicate = fs.existsSync(path.resolve(parentDirPath + "/" + prefix + pdfFileName));
            if (isDuplicate) {
                i++;
                prefix = "" + i;
            }
            else {
                return pdfFileName.substring(0, pdfFileName.indexOf(".pdf")) + prefix + ".pdf";
            }

        } while (i < 100)
        return pdfFileName;

    },
    processAttachment: function (attachment, parentDirPath, pdfFileName) {
        if (attachment.filename.indexOf(".asc") > -1) {// attachment of type signature ???
            return;
        }

        var attachmentsDir = path.resolve(parentDirPath + "/attachments");
        if (!fs.existsSync(attachmentsDir)) {
            fs.mkdirSync(attachmentsDir);
        }
        var pdfPreffix = pdfFileName.substring(0, pdfFileName.lastIndexOf("."))
        /* var dir = path.resolve(attachmentsDir + "/" + pdfDir);
         if (!fs.existsSync(dir)) {
             fs.mkdirSync(dir);
         }*/
        var attachmentFileName = pdfPreffix + "__" + attachment.filename
        if (attachment.content.length > 5000000) {
            archiveProcessor.consoleToFile("BBBBBBBBBBBBBBBBB-BigAttachment " + parentDirPath + "/" + pdfFileName);
            var attachmentFileName = pdfPreffix + "BIG-FILE__" + "__" + attachment.filename;
            var file = path.resolve(attachmentsDir + "/" + attachmentFileName);
            fs.writeFileSync(file, "BigAttachment content removed, size : " + attachment.content.size);
        } else {
            var file = path.resolve(attachmentsDir + "/" + attachmentFileName);
            fs.writeFileSync(file, attachment.content);
        }
        return attachmentFileName;
    }


}


module.exports = mailPdfGenerator;


