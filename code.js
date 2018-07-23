// Enforce https
/* if (location.protocol != 'https:') {
    location.href = 'https:' + window.location.href.substring(window.location.protocol.length);
} */

var admin = false;
var options = {};
var overwriteInspect = false;
var currentSkin = undefined;

/* Get URL before connecting to the server to make sure the right skin gets inspected. */
getULR();

var socket = io.connect('213.66.254.63:25565', /* {
    secure: true,
    rejectUnauthorized: false
} */);

/**
 * Important global variables
 */

var skins;
var thisRating = 0;
var amountOfSkins = 0; // Disregards default outfits.
var myAccount;
var userRequested = false;
var firstLoad = true;
var colorSort = "rarity";
var sortMode = "rating";
var accountWorth = "?";

var errorMessages = [
    "Can't reach the server!",
    "Oh no!",
    "Something went wrong!",
    "I'm not getting a response!",
    "It's taking longer than usual!"
]

var statusCheck = setTimeout(() => {
    document.getElementById("loading-main").innerText = errorMessages[Math.floor(Math.random()*errorMessages.length)]
    document.getElementById("loading-tips").innerHTML = "Connecting to the server is taking longer than usual, you can check the server status here: <a href='/status'>rate.livfor.it/status</a>"
}, 10000 /* Ten seconds */);

socket.on("connect", () => {
    clearTimeout(statusCheck);
})


var tips = [
    "You can change your username at the top of the page!",
    "You can upvote or downvote comments.",
    "Keep your comments civil, we delete overly-toxic comments and can suspend disruptive users.",
    'Under "Your stats" you can find your commenting karma.',
    "You can search for skins in the top left corner.",
    "If you find any bugs or want to give a suggestion regarding the website, please contact me on Reddit (u/Yogsther) or Github @ Yogsther",
    "Sorting by your own rating is a good way to find skins you haven't rated on yet."
]

document.getElementById("loading-tips").innerText = tips[Math.floor(Math.random() * tips.length)]

var loadingImage = new Image();
loadingImage.src = "logo_animated.gif";

window.onload = () => {
    updateCanvas();
    renderCanvas();
    applyThemeColor();
}


var dontPush = true;

window.onpopstate  = () => {
    getULR();
    dontPush = true;
    if(!overwriteInspect) return;
    for(let i = 0; i < skins.length; i++){
        if(skins[i].code.toLowerCase() == options.skin.toLowerCase() && skins[i].type.toLowerCase() == options.type.toLowerCase()){
            inspect(i);
        }
    }
}

window.onresize = () => {
    updateCanvas();
};

if (localStorage.getItem("token") !== null) {
    admin = true;
    applyAdmin()
}

/**
 * Get URL options. If it directly links to a specific skin, inspect that skin.
 */

function getULR() {
    var url = window.location.href;
    var urlOptions = url.substr(url.indexOf("?") + 1, url.length).split("&");

    if (urlOptions.length > 1) {
        overwriteInspect = true;
    } else {
        currentSkin = 0;
    }

    urlOptions.forEach(option => {
        option = option.split("=");
        options[option[0]] = option[1];
    })
}



function applyAdmin() {
    document.getElementById("admin-deck-insert").innerHTML = "<div class=\"header-item\"> <a href=\"admin.html\" target=\"_blank\" style='margin-left:2em; color:#ff6262' title=\"Only for moderators.\">Admin deck<\/a> <\/div>";
}


function applyThemeColor() {
    //newColor = themeColor;

    var bars = document.getElementsByClassName("bar")
    for (let el of bars) el.style.background = newColor;

    document.getElementById("header").style.boxShadow = "0px 5px 0px " + newColor
}


var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

function updateCanvas() {
    canvas.width = document.getElementById("image-wrap").offsetWidth;
    canvas.height = document.getElementById("image-wrap").offsetHeight;
}

var canvasProgress = 0;
var colorProgress = 0;
var oldColor = "black";
var newColor = "grey";
var transitionOffset = 150;
var transitionSpeed = 5;

function renderCanvas() {
    ctx.fillStyle = oldColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (oldColor !== newColor) {
        ctx.fillStyle = newColor;
        ctx.fillRect(0, 0, colorProgress, canvas.height);
        colorProgress += transitionSpeed;
        transitionSpeed += 5;
        if (colorProgress > canvas.width + transitionOffset) {
            oldColor = newColor;
            colorProgress = 0;
            transitionSpeed = 5;
        }
    }
    // Black overlay to darken color
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var spacing = .005;
    var heightOffset = 30;
    var speed = .05;
    canvasProgress -= speed;
    for (let i = 0; i < canvas.width; i++) {
        var height = Math.sin(canvasProgress + spacing * i) * heightOffset;
        ctx.fillStyle = newColor;
        if (i > colorProgress + transitionOffset) ctx.fillStyle = oldColor;
        ctx.fillRect(i, canvas.height, 1, height - canvas.height / 2);
        var increase = .5 / canvas.width;
        ctx.fillStyle = "rgba(0,0,0," + i * increase + ")";
        ctx.fillRect(i, canvas.height, 1, height - canvas.height / 2);
    }
    requestAnimationFrame(renderCanvas);
}


/**
 * When receiving all the skin data from the server
 */
socket.on("skins", data => {
    // Save skins locally
    skins = data;

    calculateLockerValue();

    // Sort skins
    justSort(sortMode);
    // Initiate counter
    amountOfSkins = 0;
    document.getElementById("sort").value = sortMode;
    /* Load skins */
    for (let i = 0; i < skins.length; i++) {
        if (skins[i].code === undefined && skins[i].name === undefined) {
            console.warn("Removed skin: ", skins[i])
            skins.splice(i, 1);
        } else {
            if (skins[i].code === undefined) {
                skins[i].code = skins[i].name.toUpperCase().split(" ").join("_");
            }
            skins[i].thumb = new Image();
            /* Supper hashtags, (%23 doesn't work with Github pages for some reason. ) */
            // TODO, TEMPORARY WILL BE FIXED ONCE SKINS ARE RENEWED
            skins[i].codeSource = skins[i].code.split("/").join("_").split("#").join("ESC_HASH_");
            skins[i].src = skins[i].src.split("#").join("ESC_HASH_").split("%23").join("ESC_HASH_");

            if (skins[i].type == "glider" || skins[i].type == "umbrella") skins[i].codeSource = skins[i].codeSource.split("'").join("");
            skins[i].thumb.src = "img/thumbnails/" + skins[i].type + "/" + skins[i].codeSource + ".png";
            var rarityColors = ["legendary", "#aa5228", "epic", "#6b41a8", "rare", "#007dbc", "uncommon", "#488c2c", "common", "#9d9d9d"]
            var color = 1;
            for (let j = 0; j < rarityColors.length; j++)
                if (skins[i].rarity == rarityColors[j]) color = j + 1;
            color = rarityColors[color];
            if (colorSort == "rating") {
                var percent = 1.2 - skins[i].rating / 5;
                var hue = ((1 - percent) * 120).toString(10);
                color = ["hsl(", hue, ",100%,50%)"].join("");
            }
            skins[i].thumb.style = 'background-color:' + color;
            skins[i].color = color;
            skins[i].thumb.draggable = 'false'
            if (skins[i].code != undefined && skins[i].code != "RECRUIT") amountOfSkins++;
            skins[i].thumb.addEventListener("click", () => {
                inspect(i);
            })
            skins[i].thumb.className = 'preview'
            if (overwriteInspect) {
                if (skins[i].code.toLowerCase() == options.skin.toLowerCase() && skins[i].type.toLowerCase() == options.type.toLowerCase()) {
                    currentSkin = i;
                }
            }
        }
    }
    /* if (userRequested) {
        populateCollection();
        userRequested = false;
    } */
    
});



socket.on("account", acc => {
    myAccount = acc;
    skins.forEach(skin => {
        if (skin.comments !== undefined) skin.comments.forEach(comment => {
            comment.karma = 1 + (comment.upvotes - comment.downvotes);
            comment.percentage = (1 + comment.upvotes) / (comment.upvotes + comment.downvotes + 1);
            if (myAccount.upvotes.indexOf(comment.id) !== -1) comment.action = "upvote";
            if (myAccount.downvotes.indexOf(comment.id) !== -1) comment.action = "downvote";
        })
    })
    thisRating = myAccount.account[skins[currentSkin].code];
    updateStars(thisRating);
    updateStats();
    if (firstLoad) {
        populateCollection()
        firstLoad = false;
    }

    firstInspect();
    /* inspect(currentSkin); */
    /* if (!overwriteInspect) inspect(currentSkin); */
})

function firstInspect(){
    if(currentSkin === undefined){
        setTimeout(() => {
            firstInspect();
        }, 150); // Wait 150ms, then check again
    } else {
        inspect(currentSkin);
    }
}

function updateStats() {
    return; // TODO: FIX
    if (myAccount == undefined || skins == undefined) return;
    var length = 0;
    var totalRate = 0;
    Object.keys(myAccount.account).forEach(function (key) {
        length++;
        totalRate += myAccount.account[key];
    });
    var average = Math.round((totalRate / length) * 100) / 100;
    if (length >= amountOfSkins) document.title = "FN Rate 🌟"
    document.getElementById("stats").innerHTML = "<i>Your stats:<br></i>Rated skins: " + length + "/" + amountOfSkins + "<br>Average rating: " + average + "<br>Karma: " + myAccount.karma + "<br>Amount of comments: " + myAccount.comments.length + "<br><span title='Account value in V-bucks, not accounting for Battlepass cost, STW cost or Starter packs.'>Account worth (?): " + accountWorth + " V-bucks</span>";
}

var rarities = ["common", "uncommon", "rare", "epic", "legendary"];

function raritySort(a, b) {
    if (rarities.indexOf(a.rarity) > rarities.indexOf(b.rarity))
        return -1;
    if (rarities.indexOf(a.rarity) < rarities.indexOf(b.rarity))
        return 1;
    return 0;
}

function rateSort(a, b) {
    if (a.rating > b.rating)
        return -1;
    if (a.rating < b.rating)
        return 1;
    return 0;
}

function commentSort(a, b) {
    try {
        if (a.comments.length > b.comments.length)
            return -1;
        if (a.comments.length < b.comments.length)
            return 1;
        return 0;
    } catch (e) {}
}

function votes(a, b) {
    if (a.stars.reduce(add, 0) > b.stars.reduce(add, 0))
        return -1;
    if (a.stars.reduce(add, 0) < b.stars.reduce(add, 0))
        return 1;
    return 0;
}

function add(a, b) {
    return a + b;
}

function personalRating(a, b) {
    if (myAccount.account[a.code] > myAccount.account[b.code] || myAccount.account[a.code] == undefined)
        return -1;
    if (myAccount.account[a.code] < myAccount.account[b.code] || myAccount.account[b.code] == undefined)
        return 1;
    return 0;
}

function justSort /*lol*/ (val) {
    /* if (val == "rating") skins.sort(rateSort);
    if (val == "rarity") skins.sort(raritySort);
    if (val == "myrating") skins.sort(personalRating)
    if (val == "votes") skins.sort(votes); */
    sortBy(val, true);
}

function sortBy(val, dontLoad) {
    if (val == "rating") skins.sort(rateSort);
    if (val == "rarity") skins.sort(raritySort);
    if (val == "myrating") skins.sort(personalRating)
    if (val == "votes") skins.sort(votes);
    if (val == "comments") skins.sort(commentSort);
    sortMode = val;
    if (dontLoad !== undefined) return;
    populateCollection();
    /* var i = 0;
    while (skins[i].code == "RECRUIT") i++;
    inspect(i) */
}

var cosmeticFilter = "all";
if (localStorage.getItem("filter") !== null) {
    cosmeticFilter = localStorage.getItem("filter")
    document.getElementById("filter-options").value = cosmeticFilter;
}

function filter(val) {
    cosmeticFilter = val;
    localStorage.setItem("filter", cosmeticFilter);
    populateCollection();
}

//var searchTimeout = setTimeout(() => {}, 0);
function search() {
    clearTimeout(searchTimeout);
    var searchTimeout = setTimeout(() => {
        populateCollection();
    }, 150);
}

function populateCollection() {
    var search = document.getElementById("search").value;
    var indexZero = false;
    //document.getElementById("collection").innerHTML = "";

    var collectionString = "";
    for (let i = 0; i < skins.length; i++) {
        var skip = false;
        if (cosmeticFilter != "all") {

            if (cosmeticFilter == "locker") {
                if (locker.indexOf(getSkinCode(skins[i])) == -1) skip = true;
            } else if (skins[i].type != cosmeticFilter) skip = true;
        }
        if (!skip) {

            var skin = skins[i];
            var skip = false;
            var searches = search.toLowerCase().split(" ");
            searches.forEach(s => {
                if (skin.name.toLowerCase().indexOf(s) == -1) skip = true;
            });

            if ((!skip || search == false) && skin.code != undefined && skin.code !== "RECRUIT") {
                if (indexZero === false) indexZero = i;
                var rating = skin.rating;
                //var myRating??
                var warn = "";
                if (myAccount !== undefined) {

                    if (myAccount.account[skin.code] === undefined && myAccount.account[skin.type.toLowerCase() + "_TYPE_" + skin.code] === undefined) warn = "!";
                }
                if (skin.code != undefined) {
                    collectionString += "<span title='" + skins[i].name + "' id='img_" + i + "' onclick='inspect(" + i + ")' class='container " + skin.rarity + "'> <img class='preview " + skin.rarity + "-block' draggable='false' style='background-color:" + skin.color + "' src=" + JSON.stringify(skin.thumb.src) + "> <span class='preivew-rating'> " + rating + " </span><span class='my-rating'>" + warn + "</span></span>"
                    try {
                        //document.getElementById("img_" + i).appendChild(skin.thumb)
                    } catch (e) {
                        console.warn("Problem with skin: " + skin.code, skin);
                    }
                }
            }
        }
    }
    document.getElementById("collection").innerHTML = collectionString;
    if (indexZero !== false && !overwriteInspect) inspect(indexZero)
}


function setColor(val) {
    if (val == "rarity") colorSort = "rarity";
    if (val == "rating") colorSort = "rating";
    get();
}
/* 
function shadowColor(index, el){
    var originalColor = skins[index].color;
    var shadedColor = shadeColor(originalColor, 50);
    el.style.boxShadow = "0px 5px 0px " + shadedColor + ";"

    function shadeColor(color, percent) {   
        var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
        return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
    }
} */


function inspect(skinIndex) {
    currentSkin = skinIndex;
    /* Update URL for specific skin */
    var skin = skins[skinIndex];

    /* Update title of page, clearify the history what skins you were viewing. */
    document.title = "FN Rate - " + skin.name;

    if(dontPush){
        dontPush = false;
    } else {
        window.history.pushState("", "FN Rate - " + skin.name, "/?skin="+skin.code.toLowerCase()+"&type="+skin.type.toLowerCase());
    }
    
    newColor = skins[skinIndex].color;
    applyThemeColor();
    var loadingTimeout = setTimeout(() => {
        //document.getElementById("full").src = loadingImage.src;
    }, 200);
    document.getElementById("full").src = "";

    // Handle rating
    try {
        if (myAccount.account[skins[currentSkin].type + "_TYPE_" + skins[currentSkin].code] !== undefined) {
            thisRating = myAccount.account[skins[currentSkin].type + "_TYPE_" + skins[currentSkin].code];
        } else {
            thisRating = myAccount.account[skins[currentSkin].code];
        }
        if (thisRating == undefined) thisRating = 0;
        updateStars(thisRating);
    } catch (e) {}
    var rating = thisRating;

    hideConfirm();

    var sign = "+";
    if (locker.indexOf(getSkinCode(skins[currentSkin])) != -1) {
        sign = "-";
        if (document.getElementById("i-own-button").classList.length < 2) document.getElementById("i-own-button").classList.toggle("inventory-button-cheked")
    } else {
        if (document.getElementById("i-own-button").classList.length > 1) document.getElementById("i-own-button").classList.toggle("inventory-button-cheked")
    }
    // Update button text and colors
    document.getElementById("i-own-button").innerText = sign + " Locker";



    var skin = skins[skinIndex];
    document.getElementById("stars").innerHTML = "";
    document.getElementById("title").innerHTML = skins[skinIndex].name.toUpperCase();

    document.getElementById("full").src = skins[skinIndex].src;
    clearTimeout(loadingTimeout)
    // Clear old alt images
    document.getElementById("secondary-insert").innerHTML = "";
    document.getElementById("third-insert").innerHTML = "";

    // Check for alternative images.
    if (skin.type == "outfit") {
        var loadingTimeoutOutfit = setTimeout(() => {
            //document.getElementById("secondary-insert").appendChild(loadingImage)
            //document.getElementById("third-insert").appendChild(loadingImage)
        }, 200);

        // Skin can have secondary or featured image (Alternative images, if so - display them.) 
        // Featured image, the one displayed in the item shop
        skin.featuredImage = new Image();
        skin.featuredImage.id = "third"
        skin.featuredImage.src = "img/featured/" + skin.code + ".png";
        skin.featuredImage.onload = () => {
            clearTimeout(loadingTimeoutOutfit)
            document.getElementById("third-insert").innerHTML = "";
            if (skins[currentSkin] == skin) document.getElementById("third-insert").appendChild(skin.featuredImage);
        }

        skin.featuredImage.onerror = () => {
            clearTimeout(loadingTimeoutOutfit)
            document.getElementById("third-insert").innerHTML = ""
        }

        // Alt image, aka full body image.
        skin.altImage = new Image();
        skin.altImage.id = "secondary"
        skin.altImage.src = "img/full/" + skin.code + ".png";
        skin.altImage.onload = () => {
            clearTimeout(loadingTimeoutOutfit)
            document.getElementById("secondary-insert").innerHTML = "";
            if (skins[currentSkin] == skin) document.getElementById("secondary-insert").appendChild(skin.altImage);
        }
        skin.altImage.onerror = () => {
            clearTimeout(loadingTimeoutOutfit)
            document.getElementById("secondary-insert").innerHTML = ""
        }
    }


    if (skins[skinIndex].comments.length > 0) {
        document.getElementById("comments").innerHTML = "";
    } else {
        document.getElementById("comments").innerHTML = '<span id="no-comments-here"> No comments yet, you can be the first to comment on this skin!</span>';
    }

    skins[skinIndex].comments.sort(dateSort);
    skins[skinIndex].comments.sort(karmaSort);

    function karmaSort(a, b) {
        if (a.karma > b.karma)
            return -1;
        if (a.karma < b.karma)
            return 1;
        return 0;
    }

    function dateSort(a, b) {
        if (a.date > b.date)
            return -1;
        if (a.date < b.date)
            return 1;
        return 0;
    }

    document.getElementById("amount-of-comments").innerText = skins[skinIndex].comments.length;

    skins[skinIndex].comments.forEach((comment, index) => {
        var downvoteSource = "vote_grey.png";
        var upvoteSource = "vote_grey.png";
        if (comment.action == "upvote") upvoteSource = "vote_green.png";
        if (comment.action == "downvote") downvoteSource = "vote_red.png";
        var karma = comment.karma;
        var percentage = comment.percentage;
        var karmaInfo = (Math.round((percentage * 100) * 100) / 100) + "% upvoted, " + comment.upvotes + " upvotes, " + comment.downvotes + " downvotes, " + (comment.upvotes + comment.downvotes) + " total votes."
        document.getElementById("comments").innerHTML += '<div class="comment"> <span class="votes"> <img src="' + upvoteSource + '" alt="" class="upvote" title="Upvote this comment" onclick="commentVote(this, true)"> <span class="karma" title="' + karmaInfo + '">' + karma + '</span> <img src="' + downvoteSource + '" onclick="commentVote(this, false)" title="Downvote this comment" alt="" class="downvote"> </span> <span class="username" id="username_' + index + '"></span> <span class="message" id="message_' + index + '"></span> </div>';
        document.getElementById("username_" + index).appendChild(document.createTextNode(comment.username + ":"));
        if (comment.mod) document.getElementById("username_" + index).classList.toggle("adminComment");
        document.getElementById("message_" + index).appendChild(document.createTextNode(censorComment(comment.message)));
        document.getElementById("username_" + index).title = new Date(comment.date);
    })

    document.getElementById("image-wrap").style.background = skins[skinIndex].color;
    document.getElementById("rating").innerHTML = skins[skinIndex].rating;
    document.getElementById("rating").title = skins[skinIndex].exactRating;
    var bars = document.getElementsByClassName("bar");
    var maxStars = 0;
    //var skinVotes = skins[currentSkin].votesArr.slice();
    var totalVotes = 0;
    var votes = skins[currentSkin].stars;
    /* for (let i = 0; i < skinVotes.length; i++) {
        votes[skinVotes[i] - 1]++;
    } */
    votes.forEach(vote => totalVotes += vote)
    for (let i = 0; i < votes.length; i++) {
        if (votes[i] > votes[maxStars]) maxStars = i;
    }
    var part = 100 / votes[maxStars];
    for (let i = 0; i < bars.length; i++) {
        var width = (votes[i] * part);
        if (isNaN(width)) width = 0;
        bars[4 - i].style.width = width + "%";
        bars[4 - i].innerHTML = votes[i]
    }
    updateStars(rating);
    document.getElementById("amount").innerHTML = totalVotes;
}

var starsRating = undefined;

function updateStars(rating) {
    if (starsRating == rating && document.getElementById("stars").innerHTML != "") return;
    starsRating = rating;
    document.getElementById("stars").innerHTML = "";
    for (let i = 0; i < 5; i++) {
        var texture = "img/star_gold.png";
        if (i + 1 > rating) texture = "img/star_grey.png";
        document.getElementById("stars").innerHTML += "<img src=" + texture + " class='star' onclick='rate(" + (i + 1) + ")' onmouseover='updateStars(" + (i + 1) + ")' >"
    }
}

var onStars = false;
document.addEventListener("mousemove", e => {
    found = false;
    e.path.forEach(path => {
        if (path.id == "stars") {
            onStars = true;
            found = true;
        }
    })
    if (!found) {
        onStars = false;
        setTimeout(() => {
            if (!onstalled) resetStars();
        }, 50)
    }
})

socket.on("confirmedVote", pack => {
    if (pack.skin.indexOf(skins[currentSkin].code) !== -1 && pack.rating == thisRating) {
        confirmVote();
    }
})

function confirmVote() {
    document.getElementById("check").title = "Vote has been recorded."
    document.getElementById("check").src = "oh_hi_mark.png"
    document.getElementById("check").style.transform = "scale(1)";
}

function pendingVote() {
    document.getElementById("check").title = "Vote has been sent."
    document.getElementById("check").src = "unconfirmed.png"
    document.getElementById("img_" + currentSkin).children[2].innerHTML = "";
    document.getElementById("check").style.transform = "scale(1)";
}

function hideConfirm() {
    document.getElementById("check").style.transform = "scale(0)";
}

function updateAccount(rating) {
    if (myAccount.account[skins[currentSkin].type + "_TYPE_" + skins[currentSkin].code] === undefined) {
        myAccount.account[skins[currentSkin.code]] = rating;
    } else {
        myAccount.account[skins[currentSkin].type + "_TYPE_" + skins[currentSkin].code] = rating;
    }
    myAccount.account[skins[currentSkin].code] = rating;
    thisRating = rating;
    updateStars(rating);
}

function getCurrentSkin() {
    if (myAccount.account)
        for (let skin of skins) {
            myacc
        }
}


function rate(rating) {
    if (rating === thisRating) return;
    rateUpdate = true;
    socket.emit("rate", {
        skin: skins[currentSkin].type + "_TYPE_" + skins[currentSkin].code,
        rating: rating
    });
    pendingVote();
    updateAccount(rating);
}

function get() {
    userRequested = true;
    socket.emit("get");
}

function resetStars() {
    updateStars(thisRating);
}

var rateUpdate = false;


var username = "Anonymous";
loadUsername();

function loadUsername() {
    var newUsername = localStorage.getItem("username");
    if (newUsername != undefined) {
        username = newUsername;
        document.getElementById("username").value = username;
    }
}

function updateUsername(newUsername) {
    // Remember username
    localStorage.setItem("username", newUsername);
    username = newUsername;
}

addEventListener("keydown", e => {
    if (e.keyCode == 13) {
        if (document.getElementById("comment-submission") == document.activeElement) submitComment();
        else document.getElementById("comment-submission").focus();
    }
})

socket.on("err", error => alert(error))

var localComments = 0;

function submitComment() {
    var message = document.getElementById("comment-submission").value;
    if (message.indexOf("/mod") != -1) {
        localStorage.setItem("token", token) = message.split(" ")[1];
        return;
    }
    if (message.length < 1) return;
    var comment = {
        message: message,
        username: username,
        skin: skins[currentSkin].type + "_TYPE_" + skins[currentSkin].code,
        token: localStorage.getItem("token")
    }
    socket.emit("comment", comment)

    document.getElementById("comment-submission").value = "";

    var index = "local_" + localComments;
    localComments++;
    if (skins[currentSkin].comments.length < 1) document.getElementById("comments").innerHTML = "";
    document.getElementById("comments").innerHTML = '<div class="comment"> <span class="votes"> <img src="vote_grey.png" alt="" class="upvote" title="Upvote this comment" onclick="alert(' + "'Cannot vote on your own comment.'" + ')"> <span class="karma" title="Local comment">1</span> <img src="vote_grey.png" onclick="alert(' + "'Cannot vote on your own comment.'" + ')" title="Downvote this comment" alt="" class="downvote"> </span> <span class="username" id="username_' + index + '"></span> <span class="message" id="message_' + index + '"></span> </div>' + document.getElementById("comments").innerHTML;
    document.getElementById("username_" + index).appendChild(document.createTextNode(comment.username + ":"));
    document.getElementById("message_" + index).appendChild(document.createTextNode(comment.message));
}

function commentVote(comment, upvote) {

    var idString = comment.parentElement.parentElement.children[2].id.substr(8);
    var commentID = skins[currentSkin].comments[Number(idString)].id;

    var type = "upvote";
    if (!upvote) type = "downvote";



    if (skins[currentSkin].comments[Number(idString)].action == type) {
        if (skins[currentSkin].comments[Number(idString)].action == "downvote") comment.parentElement.children[1].innerHTML = Number(comment.parentElement.children[1].innerHTML) + 1;
        else comment.parentElement.children[1].innerHTML -= 1;
        comment.src = "vote_grey.png";
        type = "novote";
    } else if (upvote) {
        if (skins[currentSkin].comments[Number(idString)].action == "downvote") comment.parentElement.children[1].innerHTML = Number(comment.parentElement.children[1].innerHTML) + 2;
        else comment.parentElement.children[1].innerHTML = Number(comment.parentElement.children[1].innerHTML) + 1;
        comment.src = "vote_green.png";
    } else {
        if (skins[currentSkin].comments[Number(idString)].action == "upvote") comment.parentElement.children[1].innerHTML -= 2;
        else comment.parentElement.children[1].innerHTML -= 1;
        comment.src = "vote_red.png";
    }

    var index = 0;
    if (upvote) index = 2;
    comment.parentElement.children[index].src = "vote_grey.png";

    skins[currentSkin].comments[Number(idString)].action = type;
    socket.emit("commentVote", {
        id: commentID,
        type: type
    });
}

var locker = JSON.parse(localStorage.getItem("locker"));
if (locker == null) {
    locker = new Array();
}


function toggleLocker() {
    var skinCode = getSkinCode(skins[currentSkin]);

    var sign = "-";
    if (locker.indexOf(skinCode) != -1) {
        sign = "+";
        locker.splice(locker.indexOf(skinCode), 1); // Remove item from locker
    } else {
        locker.push(skinCode);
    }

    // Save locker
    localStorage.setItem("locker", JSON.stringify(locker));
    // Update button text and colors
    document.getElementById("i-own-button").innerText = sign + " Locker";
    document.getElementById("i-own-button").classList.toggle("inventory-button-cheked")

    calculateLockerValue();
}


function calculateLockerValue() {
    var totalPrice = 0;
    locker.forEach(lockerItem => {
        var price = skins[getSkinIndexFromCode(lockerItem)].price;
        price = price.split(",").join("");
        if (!isNaN(Number(price))) {
            // Pure V-bucks cost
            totalPrice += Number(price);
        }
    })

    accountWorth = totalPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    updateStats();
}


function getSkinCode(skin) {
    return skin.type.toLowerCase() + "_TYPE_" + skin.code.toUpperCase();
}

function getSkinIndexFromCode(code) {
    if (code.indexOf("_TYPE_") != -1) {
        var type = code.substr(0, code.indexOf("_TYPE_"));
        var code = code.substr(code.indexOf("_TYPE_") + 6, code.length);
        for (let i = 0; i < skins.length; i++) {
            if (code == skins[i].code && type.toLowerCase() == skins[i].type.toLowerCase()) {
                return i;
            }
        }
    } else {
        for (let i = 0; i < skins.length; i++) {
            if (skins[i].code == code) return i;
        }
    }
}