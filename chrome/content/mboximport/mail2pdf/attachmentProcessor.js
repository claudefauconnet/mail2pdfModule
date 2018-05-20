/**
 * Created by claud on 02/12/2017.
 */
/****************************ATTACHMENTS****************************/
var attachmentProcessor = (function () {

    var self = {};


    self.extractContentTypes = function (mail) {
        var parts = {}
        var attachments = [];
        mail = mail.replace(/\r/g, "")
        var regex = /-{14}(.*)\nContent-Type:(.*)/gm;
        //  var regex=/Content-Type:(.*)/gm;
        var array;

        while ((array = regex.exec(mail)) !== null) {
            if (array.length == 3) {
                var type = array[2];
                if (type.indexOf("text") < 0) {
                    parts[array[1]] = {type: type, start: array.index}
                }
            }
        }

        for (var key in parts) {

            // isolation of attachement text
            var part = parts[key];
            var attachment = {start: part.start};
            var regexEnd = new RegExp("(-{14}" + key + "--)", "g");
            array = regexEnd.exec(mail)
            if (array && array.length > 0) {
                attachment.end = array.index;
                attachment.endLength = array[1].length;
            }

            var str = mail.substring(part.start, attachment.end);

            //extraction of attributes
            var regexAttrs = /^(.*)[:](.*)$/gm
            while ((array = regexAttrs.exec(str)) !== null) {
                attachment[array[1].trim()] = array[2].trim();
            }

            // extraction of name
            var regexName = /name=(.*)/gm
            var array = regexName.exec(str)
            if (array && array.length > 1)
                attachment.name = array[1];


            //extration of content
         var regexContent = /.*\n\n(.{200})/gm

            while ((array = regexAttrs.exec(str)) !== null) {
                attachment.startContent = attachment.start + array.index;
                attachment.endContent = attachment.startContent + array[1].length
                ;attachment.content = array[1].trim();
            }
            attachments.push(attachment)
        }
        return attachments;

    }


    self.removeAttachments = function (mail, subject, emlFileName) {
        //  return mail;
        var attachments = self.extractContentTypes(mail);
        if (attachments.length > 0) {
            var message = emlFileName + "/" + subject + " : " + resources.Warning_mailWithAttachment[self.currentLang];
            archiveProcessor.dirStatus[emlFileName].infos.push(message)


            var output = "";
            var p = 0;
            var altText = "";
            for (var i = 0; i < attachments.length; i++) {
                //   altText+="\n !!!! ATTACHMNENT REMOVED "+attachments[i].name+"\n";
                output += mail.slice(p, attachments[i].startContent) + mail.slice(attachments[i].endContent, attachments[i].end) + "\n"
                p = attachments[i].end + attachments[i].endLength
            }
            return output;
        }
        else
            return mail;

    }
    /* self.checkIfMailIsWithoutAttachements = function (mail, subject, emlFileName) {

     //   if (mail.length > (self.mailMaxSize * 1000)) {
     var p = mail.indexOf("Content-Transfer-Encoding: base64")
     if (p > -1) {
     self.totalCountMailsWithAttachements += 1;
     //  archiveProcessor.consoleToFile("\n----------------"+mail.substring(p,p+100)+"\n******************")
     var message = emlFileName + "/" + subject + " : " + resources.Warning_mailWithAttachment[self.currentLang];
     var attachmentStr = "ATTACHEMENT REMOVED ";
     var attachments = mail.substring(p - 200, p).match(/--------------(.*)/g);

     if (attachments.length > 0) {
     attachmentStr += attachments[0].replace(/-/, "");
     }
     self.dirStatus[emlFileName].infos.push(message)
     //   return mail;
     return mail.substring(0, p) + "\"n\n" + attachmentStr;
     }
     return mail;
     }*/


    return self;

})()