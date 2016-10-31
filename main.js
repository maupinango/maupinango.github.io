(function (exports, $) {
    
    $(document).ready(function() {    
        
        $(":header").click(function(){
            if(this.tagName.toLowerCase() == "h4")
                $(document.querySelectorAll('.entryBody')).hide('slow');
        });
    });
    
    function showEntries () {

        var keys = Object.keys(localStorage);
        var data = [];
        
        if (keys.length == 0) {
          
            data = [
                "<h3>Welcome to My Diary!</h3>" +
                "<p>There are currently no entries in this diary.</p>"
            ];
        }
        else {
               
            for (i = keys.length - 1; i >= 0; i--) {
                data.push(JSON.parse(localStorage.getItem(keys[i]))); 
            }
        }

        var $posts = $("#posts");
        $posts.empty();

        $.each(data, function (i, post) {
            $posts.append($("<div class='post'></div>").append($(post)));
        });
    }

    function addEntry (subject, body) {

        if($("#addButton").text() == "Add") //Add Mode
        {
            var keys = Object.keys(localStorage);
            var data = [];
            var UniqueId = new Date().getTime().toString();
          
            for (i = keys.length - 1; i >= 0; i--) {
                data.push(JSON.parse(localStorage.getItem(keys[i]))); 
            }

            body = body.replace(/\n/g, "<br/>");

            var $cont = $("<div></div>");
            var $contTitle = $("<div onclick=\"javascript: $(this).next().slideToggle('slow');\"></div>");
            var $contMessage = $("<div class='entryBody'></div>");

            $("<h3></h3>").text(subject).appendTo($contTitle);
            $("<p></p>").html(body).appendTo($contMessage);
            $("<div class='date'></div>").text((new Date).toLocaleString()).appendTo($contMessage);
            
            $("<div class='button-delete pure-button' onclick='javascript: updateEntry(" + UniqueId + ");'>Update</div>").appendTo($contMessage);
            $("<div class='button-delete pure-button' onclick='javascript: deleteEntry(" + UniqueId + ");'>Delete</div>").appendTo($contMessage);
            
            $contTitle.appendTo($cont);
            $contMessage.appendTo($cont);

            data.unshift($cont.html());
            localStorage.setItem(UniqueId, JSON.stringify(data[0]));
           
        }
        else //Edit Mode
        {
            body = body.replace(/\n/g, "<br/>");

            var $cont = $("<div></div>");
            var $contTitle = $("<div onclick=\"javascript: $(this).next().slideToggle('slow');\"></div>");
            var $contMessage = $("<div class='entryBody'></div>");

            $("<h3></h3>").text(subject).appendTo($contTitle);
            $("<p></p>").html(body).appendTo($contMessage);
            $("<div class='date'></div>").text((new Date).toLocaleString()).appendTo($contMessage);
            
            $("<div class='button-delete pure-button' onclick='javascript: updateEntry(" + UniqueIdUpdate.Value + ");'>Update</div>").appendTo($contMessage);
            $("<div class='button-delete pure-button' onclick='javascript: deleteEntry(" + UniqueIdUpdate.Value + ");'>Delete</div>").appendTo($contMessage);
        
            $contTitle.appendTo($cont);
            $contMessage.appendTo($cont);
            localStorage[UniqueIdUpdate.Value] = JSON.stringify($cont.html());
        }
    }
    
    exports.updateEntry = function (key) {

        $("#add-text").show();
        $("#SubjectText").focus();;
        $("#AddButton").hide();
        $("#addButton").text('Edit');
        UniqueIdUpdate.Value = key;
        
        var oldContent = localStorage.getItem(key);
        var title = oldContent.split("<h3>")[1].split("</h3>")[0];
        var content = oldContent.split("<p>")[1].split("</p>")[0];

        $("#SubjectText").val(title);
        $("#BodyText").val(content);
    };
    
    exports.deleteEntry = function (key) {

        $("#deleteConfirm").html("");
        
        var $cont = $("<div class='label'>Do you want delete it?</div>" +
                      "<div class='button-delete pure-button' onclick='javascript: LSDelete(" + key + ");'>Confirm</div>" +
                      "<div class='button-delete pure-button' onclick='javascript: CancelDelete();'>Cancel</div>"
                      );

        $("#deleteConfirm").addClass('post');
        $("#deleteConfirm").append($cont);
        scrollTo(0,0);
    };
    
    exports.LSDelete = function (key) {
    
        localStorage.removeItem(key);
        $("#deleteConfirm").html("");
        $("#deleteConfirm").removeClass('post');
        $(showEntries);
    };
    
    exports.CancelDelete = function (key) {
    
        $("#deleteConfirm").html("");
        $("#deleteConfirm").removeClass('post');
    };
    
    exports.addTxt = function () {
        $("#add-text").show();
        $("#SubjectText").focus();
        $("#AddButton").hide();
        $("#addButton").text('Add');
    };
    
    exports.okEdit = function () {
        
        var valid = true;
        var subject = $("#SubjectText").val();
        
        if (!subject) {
            $("#subjectValidate").show("fast");
            valid = false;
        }
        else{
            $("#subjectValidate").hide("fast");
        }
        
        var body = $("#BodyText").val();
        
        if (!body) {
            $("#bodyValidate").show("fast");
            valid = false;
        }
        else{
            $("#bodyValidate").hide("fast");
        }
        
        if(!valid)
            return;
        
        $("#AddButton").show();
        
        addEntry(subject, body);
        exports.cancelEdit();
        showEntries();
          
    };
    
    exports.cancelEdit = function () {
        
        $("#add-text input").val("");
        $("#add-text textarea").val("");
        $("#add-text").hide();
        $("#subjectValidate").hide();
        $("#bodyValidate").hide();
        $("#AddButton").show();
        UniqueIdUpdate.Value = "";
    };
    
    $(showEntries);

})(window, jQuery);