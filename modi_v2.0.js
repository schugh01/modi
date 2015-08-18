/********

	Mouseover DOM Inspector
	version 2.0.2
	last rev: 05.12.2005

	steve@slayeroffice.com

	Thanks to Aaron Barker of zelph.com for his additions to v1.x.

	Should you modify/improve upon this, please let me know about it so that
	I can update the version hosted on slayeroffice.

	PLEASE LEAVE THIS NOTICE IN TACT

TODO:
	-- add identifiers to MODI created objects to prevent them from appearing during manual DOM walk
	-- fix firstChild selections
	-- fix outline reversion
	- Replace outline's with an abs-pos DIV to emulate the outlines. (maybe)
********/

// prevent IE from making tons of requests to background images
if(document.execCommand && document.all && !window.opera) document.execCommand("BackgroundImageCache",false,true);

var d=document;
var mObj,cssObj;
var isActive = false;
var activeObj = null;
var pause = false;

var treeIndex = 0;
var clonedObj = null;
var mDown = false;
var offsetX,offsetY;


if(d.all && !window.opera) {
	var statusImg = new Array("gray.png","");
} else {
	var statusImg = new Array("gray.png","outline.png","");
}
var keyboardObjIndex = 0;
var modiHiddenObjects = new Array();
var modiFocused = false;
if(d.contentType) {
	var isAppXML = document.contentType.indexOf("application/xhtml") > -1;
} else {
	var isAppXML = false;
}

// default preferences
var pref_showAttr = true;
var pref_showDim = true;
var pref_showParents = true;
var pref_highlights = 0;
var pref_freeze = true;
var pref_backgroundHighlightColor = "#C0C0C0";
var pref_childHighlightColor = "#FAFAFA";
var pref_outlineColor = "#FF0000";
var pref_outlineWidth = "2px";
var pref_visible = true;
var pref_alwaysTransparent = false;
var pref_alwaysTransparentValue = 60;
var pref_allDataListsCollapsed = false;
var pref_showChildren = true;

var oHighlightColor = pref_backgroundHighlightColor;
var so_host = "http://slayeroffice.com/tools/modi/v2.0/";
var so_lbl = new Array();

function so_init() {
	try {
		if(prefFile != "") {
			nPrefs = d.getElementsByTagName("head")[0].appendChild(d.createElement("script"));
			nPrefs.type = "text/javascript";
			nPrefs.src = prefFile;
			oHighlightColor = pref_backgroundHighlightColor;
		}
	} catch(err) { }
	d.onmousemove = so_captureMouseMoveEvent;
	d.onkeydown = so_captureKeyDownEvent;
	window.onscroll = so_keepModiInView;
	so_prepInputs();

	all = d.getElementsByTagName("*");
	for(i=0;i<all.length;i++) {
		if(all[i].tagName != "HTML" && all[i].tagName != "BODY" && all[i].tagName != "!") {
		 	so_prepareObjForMODI(all[i]);
		}
	}

	cssObj = d.getElementsByTagName("head")[0].appendChild(d.createElement("link"));
	cssObj.type = "text/css";
	cssObj.rel = "Stylesheet";
	cssObj.href = so_host + "modi_v2.0.css";
	cssObj.id = "modiCSS";
	cssObj.xid = "modi";

	mObj = d.getElementsByTagName("body")[0].appendChild(d.createElement("div"));
	mObj.id = "modiContainer";
	mObj.xid = "modi";
	mObj.style.visibility = pref_visible?"visible":"hidden";
	mObj.onmouseover = function() { modiFocused = true; so_setOpacity(mObj,99); }
	mObj.onmouseout = function() { modiFocused = false; }

	h2 = mObj.appendChild(d.createElement("h2"));
	h2.appendChild(d.createTextNode("Mouse-over any element to begin."));
	h2.id = "tmp_h2";
}

function so_prepInputs() {
	txtInput = d.getElementsByTagName("input");
	txtArea = d.getElementsByTagName("textarea");
	for(i=0;i<txtInput.length;i++) {
		if(txtInput[i].getAttribute("type")=="text" || txtInput[i].getAttribute("type") == "") {
			txtInput[i].onfocus = function() {
				if(pause)return;
				pause = true;
				// yeah, the innerHTML is cheating. at least i'm only reading, not writing :)
				if(d.getElementById("so_h2").innerHTML.indexOf("paused")==-1)d.getElementById("so_h2").appendChild(d.createTextNode(" [paused for input focus]"));
			}
			txtInput[i].onblur = function() {
				pause = false;
			}
		}
	}
	for(i=0;i<txtArea.length;i++) {
		txtArea[i].onfocus = function() {
			if(pause)return;
			pause = true;
			if(d.getElementById("so_h2").innerHTML.indexOf("paused")==-1)d.getElementById("so_h2").appendChild(d.createTextNode(" [paused for input focus]"));
		}
		txtArea[i].onblur = function() {
			pause = false;
		}
	}
}

function so_keepModiInView() {
	winHeight = d.all && !window.opera?document.documentElement.clientHeight:window.innerHeight;
	if(mObj.offsetHeight > winHeight) return;
	if(mObj.offsetTop < _returnScrollDimensions(1)) {
		mObj.style.top = _returnScrollDimensions(1)+"px";
	}

	if(mObj.offsetTop+mObj.offsetHeight > winHeight + _returnScrollDimensions(1)) {
		mObj.style.top = (_returnScrollDimensions(1) + winHeight) - mObj.offsetHeight + "px";
	}
}

function so_captureMouseMoveEvent(e) {
	x=d.all?window.event.clientX:e.clientX;
	y=d.all?window.event.clientY:e.pageY;

	if(pause || pref_freeze) {
		if(mDown) {
			x-=offsetX;
			y-=offsetY;
			if(mDown) {
				mObj.style.top = y+"px";
				mObj.style.left = x+"px";
			}
			return;
		}
	}

	if(activeObj == null && !modiFocused) {
		so_setOpacity(mObj,40);
	} else {
		so_setOpacity(mObj,99);
	}

	if(pref_freeze) {
		so_keepModiInView();
		return;
	}

	if(d.all && !window.opera) {
		x+=_returnScrollDimensions(0);
		y+=_returnScrollDimensions(1);
	}

	if(x+mObj.offsetWidth > d.getElementsByTagName("body")[0].offsetWidth) {
		mObj.style.left = (x-mObj.offsetWidth)+"px";
	} else {
		mObj.style.left = (x+15) + "px";
	}
	if(mObj.offsetLeft < 0) mObj.style.left = "0px"

	yOffset = _returnScrollDimensions(1);

	if(y-mObj.offsetHeight<=0 || (y-mObj.offsetHeight)<yOffset) {
		mObj.style.top=(y+15)+"px";
	} else {
		mObj.style.top = (y-mObj.offsetHeight) + "px";
	}

}

function _returnScrollDimensions(which) {

	if(which) {
		if(d.body.scrollTop != 0)return d.body.scrollTop;
		if(d.documentElement.scrollTop != 0)return d.documentElement.scrollTop;
	} else {
		if(d.body.scrollLeft != 0)return d.body.scrollTop;
		if(d.documentElement.scrollLeft != 0)return d.documentElement.scrollLeft;
	}
	return 0;
}

function so_setObjHighlight(obj) {
	switch(pref_highlights) {
		case 0:
			obj.style.backgroundColor = pref_backgroundHighlightColor;
			break;
		case 1:
			//activeObj.prevOutline =
			outline = pref_outlineWidth + " solid " + pref_outlineColor;
			obj.style.MozOutline = outline;
			obj.style.outline = outline;
			break;
		case 2:
			return;
			break;
	}
}

function so_unsetObjHighlight(obj) {
	if(!obj)return;
	switch(pref_highlights) {
		case 0:
			if(obj.randomBGColor == null) {
				obj.style.backgroundColor = obj.so_prevBGColor;
			} else {
				obj.style.backgroundColor = obj.randomBGColor;
			}
			break;
		case 1:
			obj.style.MozOutline = "none";
			obj.style.outline = "none";
			break;
		case 2:
			return;
			break;
	}
}

function so_captureKeyDownEvent(e) {
	keyCode = d.all?window.event.keyCode:e.keyCode;
	if(d.getElementById("htmlView")){
		 switch(keyCode) {
		 	case 27:
				so_closeEditWindow();
				break;
			case 13:
				so_applyInnerHTML(d.getElementById("htmlViewText").value,activeObj);
				break;
		}
		return;
	}

	if(pause) {
		if(keyCode == 80) {
			pause=false;
			return;
		}
	}
	switch(keyCode) {
		case 27:
			so_cleanUp();
			break;
		case 49:
			so_snapWindow(0);
			break;
		case 50:
			//so_snapWindow(1);
			break;
		case 65:
			so_cloneObject();
			break;
		case 66:
			if(pause) return;
			so_unsetObjHighlight(activeObj);
			pref_highlights++;
			if(d.all && !window.opera) {
				maxValue = 1;
			} else {
				maxValue = 2;
			}
			if(pref_highlights>maxValue) pref_highlights = 0;
			if(activeObj) so_setObjHighlight(activeObj);
			d.getElementById("so_h2").style.backgroundImage = "url(" + so_host +""+ statusImg[pref_highlights] + ")";
			break;
		case 67:
			so_randomColor();
			break;
		case 68:
			if(pause)return;
			pref_visible = pref_visible?false:true;
			mObj.style.visibility = pref_visible?"visible":"hidden";
			break;
		case 69:
			so_removeWidth();
			break;
		case 70:
			if(pause)return;
			pref_freeze = pref_freeze?false:true;
			if(!pref_freeze)mDown = false;
			break;
		case 71:
			so_changeListState();
			break;
		case 72:
			so_hideObject();
			break;
		case 74:
			so_showModiHiddenObjects();
			break;
		case 75:
			so_removeLables();
			break;
		case 76:
			so_labelObj(activeObj);
			break;
		case 78:
			so_showFirstChild();
			break;
		case 79:
			if(activeObj) so_outlineObj(activeObj);
			break;
		case 80:
			if(!activeObj) return;
			pause = pause?false:true;
			if(pause)d.getElementById("so_h2").appendChild(d.createTextNode(" [paused]"));
			so_setOpacity(mObj,99);
			break;
		case 82:
			so_removeObj();
			break;
		case 83:
			so_insertClonedObj();
			break;
		case 84:
			if(d.getElementsByTagName("*")[treeIndex].xid == "modi") {
				do {
					treeIndex++;
					if(treeIndex>=d.getElementsByTagName("*").length)treeIndex = 0;
				} while(d.getElementsByTagName("*")[treeIndex].xid == "modi");
			}
			so_walkDOMTree();
			treeIndex++;
			break;
		case 85:
				pref_alwaysTransparent = pref_alwaysTransparent?false:true;
				so_setOpacity(mObj,pref_alwaysTransparent?60:99);
				break;
		case 86:
			so_createEditWindow(activeObj);
			break;
		case 87:
			so_showParentObj();
			break;
		case 89:
			if(d.getElementsByTagName("*")[treeIndex].xid == "modi") {
				do {
					treeIndex--;
					if(treeIndex<0)treeIndex = d.getElementsByTagName("*").length-1;
				} while(d.getElementsByTagName("*")[treeIndex].xid == "modi");
			}
			so_walkDOMTree();
			treeIndex--;
			break;
	}
}

function so_snapWindow(corner) {
	if(!pref_freeze)pref_freeze = true;
	switch(corner) {
		case 0:
			y = _returnScrollDimensions(1);
			mObj.style.left = "10px";
			mObj.style.top = y+"px";
			break;
		case 1:

			break;
	}
}

function so_changeListState() {
	if(!pref_allDataListsCollapsed) {
 		d.getElementById("attributeData").style.display = "none";
 		d.getElementById("parentData").style.display = "none";
 		d.getElementById("dimensionData").style.display = "none";
 		d.getElementById("childData").style.display = "none";
 		pref_showAttr = false; pref_showDim = false; pref_showParents = false; pref_showChildren = false;
 		pref_allDataListsCollapsed = true;
 	} else {
 		d.getElementById("attributeData").style.display = "block";
 		d.getElementById("parentData").style.display = "block";
 		d.getElementById("dimensionData").style.display = "block";
 		d.getElementById("childData").style.display = "block";
 		pref_showAttr = true; pref_showDim = true; pref_showParents = true; pref_showChildren = true;
 		pref_allDataListsCollapsed = false;
 	}
}


function so_createEditWindow(obj) {
	if(!activeObj)return;
	if(pause)return;
	pause = true;
	if(d.all && !window.opera) {
		if(mObj.offsetWidth<315) mObj.style.width = "318px";
		if(mObj.offsetHeight<215) mObj.style.height = "218px";
	}
	editWindow = mObj.appendChild(d.createElement("div"));
	editWindow.id = "htmlView";

	h3 = editWindow.appendChild(d.createElement("h3"));
	h3.appendChild(d.createTextNode("HTML Source for " + obj.tagName.toLowerCase()));

	txt = editWindow.appendChild(d.createElement("textarea"));
	txt.setAttribute("id","htmlViewText")
	txt.value = obj.innerHTML;
	editWindow.appendChild(d.createElement("br"));

	a = editWindow.appendChild(d.createElement("a"));
	a.onclick = so_closeEditWindow;
	a.className = "btn";
	if(!isAppXML) {
		a.appendChild(d.createTextNode("Cancel"));
	} else {
		a.appendChild(d.createTextNode("Close"));
	}
	if(!isAppXML) {
		a = editWindow.appendChild(d.createElement("a"));
		a.onclick = function() { so_applyInnerHTML(d.getElementById("htmlViewText").value,obj); }
		a.className = "btn";
		a.appendChild(d.createTextNode("Apply"));
	}
}

function so_applyInnerHTML(mHTML,obj) {
	if(isAppXML) {
		so_closeEditWindow();
		return;
	}
	try {
		obj.innerHTML = mHTML;
		so_closeEditWindow();

		all = obj.getElementsByTagName("*");
		for(i=0;i<all.length;i++) {
			so_prepareObjForMODI(all[i]);
		}
	} catch(err) {
		alert("An error occured while applying the innerHTML of this object. The most likely culprit is that this site is serving its content as application/xhtml+xml.\nError text was:\n\n" + err.message);
		so_closeEditWindow();
	}
}


function so_prepareObjForMODI(dObj) {
	//dObj.onmouseover = so_showObjInfo;
	//dObj.onmouseout = so_hideObjInfo;
	dObj.addEventListener?dObj.addEventListener("mouseover",so_showObjInfo,false):dObj.onmouseover = so_showObjInfo;//dObj.attachEvent("onmouseover",so_showObjInfo);
	dObj.addEventListener?dObj.addEventListener("mouseout",so_hideObjInfo,false):dObj.onmouseout = so_hideObjInfo;//dObj.attachEvent("onmouseout",so_hideObjInfo);
	dObj.so_prevBGColor = all[i].style.backgroundColor;
	dObj.so_prevWidth = all[i].offsetWidth;
	dObj.so_prevTitle = all[i].getAttribute("title");
}

function so_closeEditWindow() {
	document.getElementById("modiContainer").removeChild(document.getElementById("htmlView"))
	so_unsetObjHighlight(activeObj);
	activeObj=null;
	pause = false;
}

function so_outlineObj(obj) {
	if(pause)return;
	outline = pref_outlineWidth + " solid " + pref_outlineColor;
	obj.style.MozOutline = outline;
	obj.style.outline = outline;
}

function so_setOpacity(obj,op) {
	if(pref_alwaysTransparent) {
		op = pref_alwaysTransparentValue;
	}
	if(!d.all)op/=100;
	obj.style.opacity = op;
	obj.style.MozOpacity = op;
	obj.style.filter = "alpha(opacity=" + op + ")";
}

function so_showObjInfo() {
	if(pause)return;
	if(isActive)return;
	//if(pref_visible)mObj.style.display = "block";
	activeObj = this;
	isActive = true;
	so_buildDataDisplay(this);
	so_setOpacity(mObj,99);
	so_setObjHighlight(this);

}

function so_hideObjInfo() {
	if(pause)return;
	try {
		so_unsetObjHighlight(this);
	} catch(err) { }
	isActive = false;
	activeObj = null;
}

function so_buildDataDisplay(obj) {
	if(pause)return;
	if(d.getElementById("tmp_h2")) mObj.removeChild(d.getElementById("tmp_h2"));
	if(d.getElementById("sContainer")) mObj.removeChild(d.getElementById("sContainer"));

	if(!pref_visible) {
		ttl = obj.tagName.toLowerCase();
		if(obj.id) ttl+= " id=\"" + obj.id + "\"";
		if(obj.className) ttl+= " class=\""+obj.className+"\"";
		obj.setAttribute("title",ttl);
		return;
	}

	sObj = mObj.appendChild(d.createElement("div"));
	sObj.setAttribute("id","sContainer");

	h2 = sObj.appendChild(d.createElement("h2"));
	h2.appendChild(d.createTextNode(obj.tagName.toLowerCase()));
	if(pause)h2.appendChild(d.createTextNode(" [paused]"));
	h2.onmousedown =  so_captureOffset;
	h2.onmouseup = function() {	mDown = false; }
	h2.id = "so_h2";
	h2.style.backgroundImage = "url("+so_host+""+ statusImg[pref_highlights] + ")";

	// parents
	h3 = sObj.appendChild(d.createElement("h3"));
	h3.appendChild(d.createTextNode("structure"));
	h3.className = pref_showParents?"h3_on":"h3_off";
	h3.onclick = function() {
		pref_showParents = pref_showParents?false:true;
		this.className = pref_showParents?"h3_on":"h3_off";
		document.getElementById("parentData").style.display = pref_showParents?"block":"none";
	}
	so_getParents(obj,sObj);



	// credits
	div = sObj.appendChild(d.createElement("div"));
	div.setAttribute("id","credits");
	b = div.appendChild(d.createElement("b"));
	//b.appendChild(d.createTextNode("[esc] to quit | "));
	a = d.createElement("a");
	a.setAttribute("href","javascript:so_cleanUp();");
	a.appendChild(d.createTextNode("[esc] to quit"));
	b.appendChild(a);
	b.appendChild(d.createTextNode(" | "));

	a = b.appendChild(d.createElement("a"));
	a.setAttribute("title","Help!");
	a.setAttribute("href",so_host + "modi_help.html");
	a.setAttribute("target","_blank");
	a.appendChild(d.createTextNode("help documentation"));

	div.appendChild(d.createElement("br"));
	div.appendChild(d.createTextNode("Mouseover DOM Inspector"));
	div.appendChild(d.createElement("br"));
	div.appendChild(d.createTextNode("version 2.0.2 (05.11.2005)"));
	div.appendChild(d.createElement("br"));
	div.appendChild(d.createTextNode("slayeroffice.com"));
	div.appendChild(d.createElement("br"));

	so_tagAsMODI();

	if(d.all && !window.opera) {
		// make up for IE's lack of max-width support.
		if(mObj.offsetWidth>400) mObj.style.width="400px";
	}

	function so_wrapAttributeValue(attrValue) {
		// IE has a word-break css property. no need to do anything if this is IE
		if(d.all && !window.opera) return attrValue;
		// attribute value has a space in it. return.
		if(attrValue.indexOf(" ")>-1) return attrValue;
		for(ee=0;ee<attrValue.length;ee++) if(ee%50==0) attrValue = attrValue.substring(0,ee) + " " + attrValue.substring(ee,attrValue.length);
		return attrValue;
	}

}


function so_getParents(curNode,dataContainer){
    var zone = null,
        output = null,
        contentbox = null;

    ul = dataContainer.appendChild(d.createElement("ul"));
    ul.setAttribute("id","parentData");
    ul.style.display = pref_showParents?"block":"none";

    $(curNode).parents().each(function () {
        zone = zone || $(this).data('vrZone');

        if ($(this).data('vrContentbox') !== undefined && $(this).data('vrContentbox') !== "" && contentbox === null) {
            contentbox = $(this).data('vrContentbox');
        }

        if (zone !== undefined && contentbox !== null) {
            output = zone + '#' + contentbox;
        } else if (zone !== undefined && contentbox === null) {
            output = zone;
        }


    });

    li = ul.appendChild(d.createElement("li"));

    li.appendChild(d.createTextNode(output));

    li.myObj = output;
    li.className = "Structure";
    li.onmouseover = function() {
        this.myObj.so_prevBGColor = this.myObj.style.backgroundColor;
        so_setObjHighlight(this.myObj);
    }
    li.onmouseout = function() {
        so_unsetObjHighlight(this.myObj);
    }


}

function so_showParentObj() {
	if(pause)return;
	so_unsetObjHighlight(activeObj);
	if(activeObj.parentNode && activeObj.tagName != "HTML") {
		activeObj = activeObj.parentNode
		activeObj.so_prevBGColor = activeObj.style.backgroundColor;
		so_setObjHighlight(activeObj);
		so_buildDataDisplay(activeObj);
	}
}


function so_removeObj() {
	if(pause)return;
	activeObj.parentNode.removeChild(activeObj);
}

function so_cleanUp() {
	d.getElementsByTagName("head")[0].removeChild(d.getElementById("modiCSS"));
	d.getElementsByTagName("body")[0].removeChild(d.getElementById("modiContainer"));
	// id is "modi" if invoked on its own, "sss" if invoked from the favelet suite
	if(d.getElementById("modi")) {
		d.getElementsByTagName("body")[0].removeChild(d.getElementById("modi"));
	} else {
		d.getElementsByTagName("body")[0].removeChild(d.getElementById("sss"));
	}
	d.onkeydown = null;
	d.onmousemove = null;

	all = d.getElementsByTagName("*");
	for(i=0;i<all.length;i++) {
		//all[i].onmouseover = null;
		//all[i].onmouseout = null;
		all[i].removeEventListener?all[i].removeEventListener("mouseover",so_showObjInfo,false):all[i].onmouseover = null;//all[i].detachEvent("onmouseover",so_showObjInfo);
		all[i].removeEventListener?all[i].removeEventListener("mouseout",so_hideObjInfo,false):all[i].onmouseout = null;//all[i].detachEvent("onmouseout",so_hideObjInfo);
		all[i].style.backgroundColor = all[i].so_prevBGColor;
		all[i].so_prevBGColor = null;
		if(all[i].randomBGColor)all[i].randomBGColor = null;
		all[i].setAttribute("title",all[i].so_prevTitle);
		all[i].style.outline = "none";
		all[i].style.MozOutline = "none";
	}

	if(activeObj)activeObj.style.backgroundColor = activeObj.so_prevBGColor;
}

function so_randomColor() {
	if(pause)return;
	if(activeObj == null) return;
	if(!activeObj.randomBGColor) {
		r = Math.floor(Math.random() * 256);
		g = Math.floor(Math.random() * 256);
		b = Math.floor(Math.random() * 256);
		rgb = "rgb(" + r + "," + g + "," + b + ")";
		if(activeObj) {
			activeObj.style.backgroundColor = rgb;
			activeObj.randomBGColor = rgb;
		}
	} else {
		if(activeObj.style.backgroundColor == activeObj.so_prevBGColor) {
			activeObj.style.backgroundColor = activeObj.randomBGColor;
		} else {
			activeObj.style.backgroundColor = activeObj.so_prevBGColor;
			activeObj.randomBGColor = activeObj.so_prevBGColor;
		}
	}
}

function so_walkDOMTree() {
	if(pause)return;
	if(activeObj) so_unsetObjHighlight(activeObj);
	if(treeIndex>=d.getElementsByTagName("*").length) treeIndex = 0;
	if(treeIndex<0) treeIndex = d.getElementsByTagName("*").length - 1;

	activeObj = d.getElementsByTagName("*")[treeIndex];
	if(d.all && !window.opera) {
		if(activeObj.tagName == "!") {
			treeIndex++;
			activeObj = d.getElementsByTagName("*")[treeIndex];
		}
	}
	so_buildDataDisplay(activeObj);
	so_setObjHighlight(activeObj);
	if(!pref_freeze) {
		mObj.style.top = so_findPosition(activeObj,0)+15 + "px";
		mObj.style.left = so_findPosition(activeObj,1)+15 + "px";
	}
}

function so_tagAsMODI() {
	modiChildren = mObj.getElementsByTagName("*");
	for(m=0;m<modiChildren.length;m++) modiChildren[m].xid = "modi";
}

function so_findPosition(obj,pType) {
	cur = 0;
	if(obj.offsetParent) {
		while(obj.offsetParent) {
			cur+=pType?obj.offsetLeft:obj.offsetTop;
			obj = obj.offsetParent;
		}
	}
	return cur;
}

function so_cloneObject() {
	if(pause)return;
	if(!activeObj)return;
	clonedObj = activeObj.cloneNode(true);
}

function so_insertClonedObj() {
	if(pause)return;
	if(!activeObj || !clonedObj)return;
	activeObj.appendChild(clonedObj);
	so_prepareObjForMODI(clonedObj);

	c = clonedObj.getElementsByTagName("*");
	for(i=0;i<c.length;i++) so_prepareObjForMODI(c[i]);
}

function so_captureOffset(e) {
	mDown = true;
	nx = parseInt(mObj.offsetLeft);
	ny = parseInt(mObj.offsetTop);

	if(d.all) {
		offsetX=window.event.clientX - nx;
		offsetY=window.event.clientY - ny;
	} else {
		offsetX = e.pageX - nx;
		offsetY = e.pageY - ny;
	}
}

function so_hideObject() {
	if(pause || !activeObj)return;
	if(activeObj.style.visibility == "" || activeObj.style.visibility == "visible") {
		modiHiddenObjects[modiHiddenObjects.length] = activeObj;
		activeObj.style.visibility = "hidden"
		activeObj = null;
	}
}

function so_showModiHiddenObjects() {
if(pause)return;
	for(w=0;w<modiHiddenObjects.length;w++) {
		modiHiddenObjects[w].style.visibility = "visible";
	}
	modiHiddenObjects = new Array();
}

function so_removeWidth() {
	if(pause) return;
	if(!activeObj) return;

	if(activeObj.so_prevWidth != activeObj.offsetWidth) {
		activeObj.style.width = activeObj.so_prevWidth + "px";
		activeObj.so_prevWidth = activeObj.offsetWidth;
	} else {
		activeObj.style.width = "auto";
	}
}


so_init();
