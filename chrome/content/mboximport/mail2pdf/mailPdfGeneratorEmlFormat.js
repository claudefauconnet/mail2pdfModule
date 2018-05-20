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







mailPdfGenerator = (function () {

    var self = {};
    self.maxPdfSubjectLength = 33
    var fs = require('fs')
    var PDFDocument = require('pdfkit');
    var pdfDir = "pdfArchives";
    var path = require('path');

    var addMetaData = true;
    self.createMailPdf = function (mail, fileName, fullPath, sender, senderDirDate, callback) {
        try {

            sender = self.formatStringForArchive(sender, 30);

            if (mail.html)
                mail.html = self.removeHtmlTags(mail.html);
            if (mail.text)
                mail.text = self.removeHtmlTags(mail.text);
            /*    if (mail.messageId=="<630802301.184128.1511534903112.JavaMail.www@wsfrf1408>")
             archiveProcessor.consoleToFile( "----------------------------------------------\n"+mail.text )
             if (mail.messageId=="<630802301.184128.1511534903112.JavaMail.www@wsfrf1408>")
             archiveProcessor.consoleToFile( mail.html )*/

            /*  var todayArchivedir = pdfDir + "/" + sender + "/" + senderDirDate;

             if (fs.existsSync(todayArchivedir)) {
             common.deleteFolderRecursive(todayArchivedir);
             }*/

            fileName = common.toAscii(common.truncate(fileName, common.maxDirLength));
            var dirs = fullPath.split(path.sep);
            //    dirs.splice(0, 1) // on enleve le repertoire de lk'archive lui meme (enveloppe)
            dirs.splice(dirs.length - 1, 1, fileName)//on enleve le nom du repertoire et on ajoute le nom du fichier qui contient les mails du sous répertoire à un niveau donné
            dirs.splice(0, 0, sender, senderDirDate)
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
            mailTitle = mailPdfGenerator.formatStringForArchive(mailTitle, self.maxPdfSubjectLength);

            mailTitle = mailPdfGenerator.removeMultipleReAndFwdInTitle(mailTitle);
            pdfFileName = common.dateToString(mail.date) + "-" + mailTitle + ".pdf";
            pdfFileName = mailPdfGenerator.processDuplicateMailTitles(parentDirPath, pdfFileName);


            var attachementsStr = "";
            if (mail.attachments) {
                for (var i = 0; i < mail.attachments.length > 0; i++) {
                    if (mail.attachments[i].name) {
                        //  archiveProcessor.consoleToFile(mail.attachments[i].name)
                        //    var id = mail.attachments[i].contentId;
                        attachementsStr =  mail.attachments[i].name + "\n";
                        self.processAttachment(mail.attachments[i], parentDirPath, pdfFileName)
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
            //  doc.text(mail.headers["Message-ID"], {width: textWidth, align: 'left'})


            doc.fontSize(fontSize.title)
            doc.text('From : ', {width: textWidth, align: 'left'})
            doc.fontSize(fontSize.text)
            if (mail.from)
                doc.text(mail.from.email, {width: textWidth, align: 'left'})

            doc.moveDown(0.5)
            doc.fontSize(fontSize.title)
            doc.text('To : ', {width: textWidth, align: 'left'})
            doc.fontSize(fontSize.text)
            if (mail.to)
                doc.text(mail.to.email, {width: textWidth, align: 'left'})


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


            if (attachementsStr.length > 0) {
                doc.moveDown(0.5)
                doc.fontSize(fontSize.title)
                //  doc.fontcolor("red")
                doc.text('Attachments removed : ', {width: textWidth, align: 'left'})
                doc.fontSize(fontSize.text)
                doc.text(attachementsStr, {width: textWidth, align: 'left'})

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
            if (mail.subject)
                doc.text(mail.text, {width: textWidth, align: 'left'})
            else if (mail.html)
                doc.text(mail.html, {width: textWidth, align: 'left'})

            doc.end();
            archiveProcessor.totalPdfSaved += 1
            return callback(null, {path: relativeFolderPath, file: pdfFileName});
        }
        catch (e) {
            archiveProcessor.consoleToFile("!! pdf exception " + e)
            callback(e)
        }
    }



    self.formatStringForArchive = function (str, maxLength) {
        str = common.toAscii(common.truncate(str, maxLength));
        str = str.replace(/ /g, "_");
        str = common.replaceNonLetterOrNumberChars(str, "");
        str = str.replace(/_/g, "-");
        return str;
    }
    self.removeMultipleReAndFwdInTitle = function (str) {
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
    }
    self.removeHtmlTags = function (str) {
        str = str.replace(/<\/p>/gi, "\n");
        str = str.replace(/<BR>/gi, "\n");
        str = str.replace(/<[^>]*>/gi, "");

        //specific CF
        str = str.replace(/&nbsp;/gi, "");
        str = str.replace(/@import.*/gi, "");
        str = str.replace(/[™•]+.*/gm, "");

        str = str.replace(/[\r]+.*/gm, "");


        return str;
    }
    self.processDuplicateMailTitles = function (parentDirPath, pdfFileName) {
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

    }
    self.processAttachment = function (attachment, parentDirPath, pdfFileName) {
        if (attachment.name.indexOf(".asc")>-1) {// attachment of type signature ???
            return;
        }

        var attachmentsDir = path.resolve(parentDirPath + "/attachments" );
        if (!fs.existsSync(attachmentsDir)) {
            fs.mkdirSync(attachmentsDir);
        }
        var pdfPreffix= pdfFileName.substring(0, pdfFileName.lastIndexOf("."))
        /* var dir = path.resolve(attachmentsDir + "/" + pdfDir);
         if (!fs.existsSync(dir)) {
             fs.mkdirSync(dir);
         }*/

        if(attachment.data.length>5000000) {
            archiveProcessor.consoleToFile("BBBBBBBBBBBBBBBBB-BigAttachment " + parentDirPath + "/"+ pdfFileName);
            var file = path.resolve(attachmentsDir + "/" + pdfPreffix+ "BIG-FILE__"+"__"+attachment.name);
            fs.writeFileSync(file, attachment.data.size);
        }else{
            var file = path.resolve(attachmentsDir + "/" + pdfPreffix+"__"+attachment.name);
            fs.writeFileSync(file, attachment.data);
        }
    }
    return self;
})
();


