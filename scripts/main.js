/*
Minecraft Pixel Art Maker
© gd-codes 2020
*/

/** Colours that are selected on creation of a new image form. */
const default_palette = Array.from(Colours.keys()).join(' ');

/** 
 * Stores the raw & processed image data for all uploaded pictures,
 * indexed by the 6-digit random uid.
 */
const PictureData = {
  "000001": {
      originalImage: undefined,
      finalImage: undefined,
      shadeMap: undefined
  }
};


// 1. Ask user to confirm before closing the tab
window.addEventListener('beforeunload', confirmCloseTab);
// 2. Bind all UI elements to appropriate callbacks when DOM is loaded
$(document).ready(setup);
// 3. Lazy-load carousel images after page loads 
$(window).on('load', lazyload);


/**
 * Binds all document UI callbacks and displays initial dynamic page content on page load.
 */
function setup() {
  console.log("Minecraft Pixel Art Maker - Document Ready !");
  
  // Create the first form that is visible when page is opened
  newImageUpload("000001");
  /* NOTE
  Dynamically generated image forms (green plus button to add extra images) have a random 6 character suffix
  in HTML ids of all DOM elements within the form that have an `id` attribute. 
  This is refered to as `uid` in most functions that use it here in JS.
  The uid of the one form already on the page when the website is opened (index.html) is "000001"
   */

  $("#addNewImgBtn").click(newImageUpload);
  
  $("#writePackBtn").click(function(event) {
    startCreateBhvPack(event);
    $("body").data("confirm-page-unload", "1");
  });
  $("#resetAddonDiv").click(function(event) {
    clearBehaviourPack();
  });

  // Construct Colour palette selection table modal and its controls
  $("#clrSelBtn_All").click(function() { $("input[name='clrSelect']").prop('checked', true); });
  $("#clrSelBtn_None").click(function() { $("input[name='clrSelect']").prop('checked', false); });
  $("#clrSelBtn_Inv").click(function() {  
    $("input[name='clrSelect']").each(function(index, elem) {
      $(elem).prop('checked', !$(elem).prop('checked'));
    });
  });
  $("#clrSelBtn_Dye").click(function() {
    $("input[name='clrSelect']").each(function(index, elem) {
      $(elem).prop('checked', Colours.get($(elem).attr('value')).is_dye);
    });
  });
  $("#clrSelBtn_greys").click(function() {
    $("input[name='clrSelect']").each(function(index, elem) {
      $(elem).prop('checked', Colours.get($(elem).attr('value')).is_greyscale);
    });
  });
  $("#clrSelBtn_NB").click(function() { 
    $("input[name='clrSelect']").each(function(index, elem) {
      if (Colours.get($(elem).attr('value')).is_biomevar) $(elem).prop('checked', false);
    });
  });

  // Populate the colour palette selection table
  $("#colourPaletteTable tbody").html(ejs.render(EJStemplates.colourSelectionTable, {}));

  // add-questionmark indicators for tooltip helptext
  $(".add-questionmark").each(function (index, elem) {
    let h = $(elem).html();
    $(elem).html(h+SVGicons.questionmark);
  });

  // Activate all bootstrap tooltips
  $('[data-toggle="tooltip"]').tooltip();

  // Setup default behaviour pack generation settings
  $('#buildWithStructures').prop('checked', true);

  // Prevent links in PWA window opening in browser
  const isPWA = window.matchMedia('(display-mode: standalone)');
  if (isPWA.matches) {
    $('a.alert-link[target="_blank"]').removeAttr('target');
  }
  
}

/** Make the browser display a confirmation prompt to the user on attempting to close the tab */
function confirmCloseTab(event) {
  if (Number($("body").data("confirm-page-unload"))) {
    event.preventDefault();
    event.returnValue = '';
    return '';
  }
}

/** Add image sources to and intialise the demoCarousel */
function lazyload() {
  // Add the carousel images to index.html
  for (var i=1; i<=5; i++) {
    $("div#cari"+i+" > img").attr('src', "images/d"+i+".png");
  }
  $("#demoCarousel").carousel({interval: 2000});
}


/** 
 * Generate a new Image Upload Form 
 * @param {string} uid - Optional 6 character suffix to uniquely image & elements of this form.
 *  Will be randomly generated if unspecified.
 */
function newImageUpload(uid) {
  var charset = "abcdefghijklmnopqrstuvwxyz1234567890";
  if (typeof(uid) !== 'string' || uid.length !== 6) {
    uid = "";
    for(var rb=0; rb<6; rb++) {
      uid += charset.charAt(Math.floor(Math.random() * charset.length));
    }
  }
  // random 6-char uid appended to the HTML DOM id of all elements makes them distinguishable
  $("#navbarList").append(ejs.render(EJStemplates.imageNavTab, {uid: uid}));
  
  $("#tempErrDialog").remove();
  $("#tabContainer").append(ejs.render(EJStemplates.imageForm, {uid: uid}));
  
  console.info("New image form with id suffix", uid);
  
  // Perform all callback bindings of UI elements
  $("#imgInput_"+uid).on('change', function(event) {
    fileInputHandler(this, event.target.files[0]);
    $("body").data("confirm-page-unload", "1");
  }); 
  $("#resetImageFormBtn_"+uid).closest('form').on('reset', function() {
    resetImgHandler(this);
  }); 
  $("#3dOption_"+uid).on('click', function() {
    displayPaletteOptions(this);
  });
  $("#materialChooseBtn_"+uid).on('click', function() {
    configureColourModal(this);
  });
  $("#imageForm_"+uid).submit(function(event){
    submitImgFormHandler(this, event);
  });
  $("#deleteBtn_"+uid).click( function() { 
    deleteImgForm(this); 
  });
  $("#imgEditBtn_"+uid).click(function() {
    editImgForm(this);
  });
  $("#materialOptsDisplay_"+uid).data("selected", default_palette);
  $('[data-toggle="tooltip"]').tooltip();
  $("li#link_"+uid+" a").click();
  $("#resetImageFormBtn_"+uid).click();
  
  PictureData[uid] = {
    originalImage: undefined,
    finalImage: undefined,
    shadeMap: undefined
  }

  refreshColourDisplay(uid);
}


/** 
 * Grab content of uploaded images and save it as a data-URI in `PictureData`.
 * @param {HTMLElement} elem - input type='file' of the upload
 * @param {File} file - Uploaded target file
 */
function fileInputHandler(elem, file) {
  $(elem).next('.custom-file-label').html(file.name);
  var uid = $(elem).attr('id').slice(-6);
  var reader = new FileReader();
  reader.onload = function(loadevent){
    PictureData[uid]['originalImage'] = loadevent.target.result;
  }
  reader.onerror = function(e){
    alert("Error\n\nThere was a problem loading this image.");
  }
  reader.readAsDataURL(file);
}

/**
 * Reset an image upload form to its default blank state, and also pre-select default options.
 * @param {HTMLElement} elem - Any element from the target form, containing its uid.
 */
function resetImgHandler(elem) {
  var uid = $(elem).attr('id').slice(-6);
  setTimeout(function() {
    $("#ditherSwitch_"+uid).prop("checked", true);
    $("#mapSize11_"+uid).prop("checked", true);
    $("#materialOptsDisplay_"+uid).data("selected", default_palette);
    refreshColourDisplay(uid);
    $("#3dSwitch_"+uid).prop('checked', false);
    $("#extraHeightOption_"+uid).collapse('hide');
    $("input#heightInput_"+uid).attr("required", false);
  });
}

/**
 * Show or hide the extra fields in the image upload form for 3D data input.
 * @param {HTMLElement} elem - Any element from the target form, containing its uid.
 */
function displayPaletteOptions(elem) {
  var uid = $(elem).attr('id').slice(-6);
  if ($("#3dSwitch_"+uid).prop('checked')) {
    $("#extraHeightOption_"+uid).collapse('show');
    $("input#heightInput_"+uid).attr("required", true);
  } else {
    $("#extraHeightOption_"+uid).collapse('hide');
    $("input#heightInput_"+uid).attr("required", false);
  }
}

/**
 * On opening the globally shared colour palette selection modal from a specific image form,
 * set the selection state of the checkboxes to match the stored palette values for the image.
 * Re-bind the callback to save the new palette to the same image form's data.
 * Then display the modal.
 * @param {HTMLElement} elem - Any element from the target form, containing its uid.
 */
function configureColourModal(elem) {
  var uid = $(elem).attr('id').slice(-6);
  var sel = $("#materialOptsDisplay_"+uid).data("selected");
  $("input[name='clrSelect']").each(function(index, chekbox) {
    $(chekbox).prop('checked', (sel.includes($(chekbox).attr('value'))));
  });
  $("#saveColoursBtn").off('click');
  $("#saveColoursBtn").click(function() {
    var clrset = [];
    $("input[name='clrSelect']").each(function(index, chekbox2) {
      if ($(chekbox2).prop('checked')) {
        clrset.push($(chekbox2).attr('value'));
      }
    });
    $("#materialOptsDisplay_"+uid).data("selected", clrset.join(" "));
    refreshColourDisplay(uid);
  });
  $("#colourTableModal").modal('show');
}

/**
 * Update the visual colour palette indicators on the image upload form.
 * @param {HTMLElement} elem - Any element from the target form, containing its uid.
 */
function refreshColourDisplay(uid) {
  var htmlc = [];
  for (var c of $("#materialOptsDisplay_"+uid).data("selected").split(" ")) {
    let colourdata = Colours.get(c);
    if (colourdata!==undefined)
      htmlc.push(ejs.render(EJStemplates.colourPaletteIcon, {colourdata: colourdata}));
  }
  var content = htmlc.join("");
  if (content.search(/\w/i) < 0) {
    content = EJStemplates.colourPaletteFallback;
    $("#materialOptsDisplay_"+uid).data("selected", default_palette);
  } 
  $("#materialOptsDisplay_"+uid).html(content);
}

/**
 * Perform client-side validation of a completed image upload form,
 * disable input fields, process the image data in it and also reset
 * the linked survival guide, if any.
 * Also prevents the form submission event reloading the page.
 * @param {HTMLElement} elem - Any element from the target form, containing its uid.
 * @param {Event} event - Form submit event
 */
function submitImgFormHandler(elem, event) {
  event.preventDefault();
  var uid = $(elem).attr('id').slice(-6);
  var name = $("#fnNameInput_"+uid).val();
  // Validate no duplicate/conflicting names in multiple images
  for (var x of $("input[id^=fnName]")) {
    var otherid = $(x).attr('id').slice(-6);
    if ((otherid!=uid) && 
        ($(x).val().toUpperCase() == name.toUpperCase()) && 
        ($(x)[0].hasAttribute("disabled"))) {
      alert("Error \n\nYou have already used the function name \""+name+
           "\" for another image.\nPlease enter a new unique name !");
      return;
    }
  }
  // Collect all data from form fields
  $("#spinnerModal").addClass('d-block'); $("#spinnerModal").removeClass('d-none');
  var area = $("input[name='mapsizeopt_"+uid+"']:checked").val();
  area = [Number(area[0]), Number(area[2])];
  var palette = $("#materialOptsDisplay_"+uid).data("selected");
  var d3 = Boolean($("#3dSwitch_"+uid+":checked").length > 0);
  var dither = Boolean($("#ditherSwitch_"+uid+":checked").length > 0);
  // Read the uploaded image data from stored base64 URI, and disable the form and begin analysis
  var image = new Image();
  image.onload = function() {
    var analysis = analyseImage(uid, image, area, palette, d3, dither);
    if (!analysis) {
      $("form#imageForm_"+uid+" :input").prop('disabled', true);
      $("form#imageForm_"+uid+" :radio").prop('disabled', true);
      $("form#imageForm_"+uid+" :checkbox").prop('disabled', true);
      $("form#imageForm_"+uid+" :file").prop('disabled', true);
      $("#formActionsPreSubmit_"+uid).addClass("d-none");
      $("#formActionsPreSubmit_"+uid).removeClass("d-flex");
      $("#formActionsPostSubmit_"+uid).addClass("d-flex");
      $("#formActionsPostSubmit_"+uid).removeClass("d-none");
      $("#navbarList li[id='link_"+uid+"'] a").html(ejs.render(EJStemplates.deleteX, 
        {fname:name, uid:uid}));
      $("#deleteBtn_"+uid).click( function(event){deleteImgForm(this);} );
      
      deleteSurvivalGuide(uid, true);
      
    } else {
      alert("Error\n\nAn unknown error occurred while processing");
      console.error("Error processing image "+uid);
    }
    $("#spinnerModal").addClass('d-none'); $("#spinnerModal").removeClass('d-block');
  }
  image.onerror = function() {
    alert("Error\n\nThere was a problem reading the uploaded image !");
    $("#spinnerModal").addClass('d-none'); $("#spinnerModal").removeClass('d-block');
  }
  image.src = PictureData[uid]['originalImage'];
}

/**
 * Delete an image upload form and all its associated data.
 * @param {HTMLElement} elem - Any element from the target form, containing its uid.
 */
function deleteImgForm(elem) {
  var uid = $(elem).attr('id').slice(-6);
  var name = $("#fnNameInput_"+uid).val();
  if (! name) {name = "this image form";}
  var verify = confirm("Delete "+name+" : \nAre you sure ?");
  if (verify) {
    $("#link_"+uid).remove();
    $("#tabPane_"+uid).remove();
    delete PictureData[uid];
    console.info("Removed image form ", uid);
    deleteSurvivalGuide(uid);
    $("#navbarList a.nav-link").first().click();
  }
}

/**
 * Re-enable a submitted image form's input fields and unbind callbacks, allowing editing.
 * @param {HTMLElement} elem - Any element from the target form, containing its uid.
 */
function editImgForm(elem) {
  var uid = $(elem).attr('id').slice(-6);
  $("form#imageForm_"+uid+" :input").prop('disabled', false);
  $("form#imageForm_"+uid+" :radio").prop('disabled', false);
  $("form#imageForm_"+uid+" :checkbox").prop('disabled', false);
  $("form#imageForm_"+uid+" :file").prop('disabled', false);
  $("#formActionsPreSubmit_"+uid).removeClass("d-none");
  $("#formActionsPreSubmit_"+uid).addClass("d-flex");
  $("#formActionsPostSubmit_"+uid).removeClass("d-flex");
  $("#formActionsPostSubmit_"+uid).addClass("d-none");
  $("#viewOrigImgBtn_"+uid).off('click');
  $("#viewResizedImgBtn_"+uid).off('click');
  $("#viewFinalImgBtn_"+uid).off('click');
}

/**
 * Used to generate UUIDs for the behaviour pack.
 * Credit: https://stackoverflow.com/a/2117523
 * @returns A Type-4 UUID string
 */
function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

/**
 * Collect processed image data from all complete forms on the page, 
 * and proceed to write the behaviour pack containing those images.
 * @param {MouseEvent} event - Click event from the Generate Pack button.
 */
function startCreateBhvPack(event) {
  event.preventDefault();
  var f, processed=[];
  for (f of $("form[id^='imageForm']")) {
    let uid = $(f).attr('id').slice(-6);
    if (PictureData[uid]['finalImage']!=undefined) {
      processed.push({uid: uid,
                      name: $("#fnNameInput_"+uid).val(),
                      pic: PictureData[uid]['finalImage']
                    });
    } 
  }
  var l = $("form[id^='imageForm']").length - processed.length;
  if (l > 0) {
    let w = confirm("Warning\n\n"+l+" of the image forms have not been processed."+
                    "These will not be included in the pack - Continue anyway ?");
    if (!w) {return;}
  }
  $("#spinnerModal").addClass('d-block');
  $("#spinnerModal").removeClass('d-none');
  
  writeBhvPack(processed, [uuidv4(), uuidv4()]);
}


/**
 * Create the Add-on ZIP file structure and make it available for download via the UI.
 * @param {Array<{uid: string, name: string, pic: string}>} images -
 *  Collection of images to be added to the pack
 * @param {[string, string]} uuids - 2 UUIDs for pack manifest
 */
function writeBhvPack(images, uuids) {
  var pack = new JSZip();
  // Manifest
  var manifest = JSON.stringify({
    format_version: 2,
    header: {
      name: $("#bpackNameInput").val(),
      description: $("#bpackDescInput").val(),
      uuid: uuids[0],
      version: [1,0,0],
      min_engine_version: [1,20,0]
    },
    modules: [{
      description: "Created with https://gd-codes.github.io/mc-pixelart-maker, on " + 
        new Date().toDateString(),
      type: "data",
      uuid: uuids[1],
      version: [1,0,0]
    }]
  }, null, 2);
  pack.file('manifest.json', manifest);
  // Icon, containing site logo and preview of up to 4 images that are in the pack
  var icon;
  if (images.length>4) {
    icon = makeLogo(images.reverse().slice(-4).map(x => x.pic));
  } else if (images.length==0) {
    icon = makeLogo([]);
  } else {
    icon = makeLogo(images.reverse().map(x => x.pic));
  }
  pack.file('pack_icon.png', icon.split(',')[1], {base64:true});
  // Get values of pack settings
  var keep = Boolean($("#keepBlocks:checked").length > 0);
  var link = Boolean($("#useLinkedPos:checked").length > 0);
  var strucs = Boolean($("#buildWithStructures:checked").length > 0);
  // Write the functions for each image - see `functionWriter.js`
  var fnfolder = pack.folder('functions');
  for (let o of images) {
    let palette = $("#materialOptsDisplay_"+o.uid).data("selected").split(" ");
    let extrainfo = ($("#3dSwitch_"+o.uid+":checked").length > 0)? $("#heightInput_"+o.uid).val() : 0;
    let shm = PictureData[o.uid]['shadeMap'];
    let fnlist = writeCommands(o.name, o.pic, palette.length, extrainfo, keep, link, strucs, shm);
    for (let f=0; f<fnlist.length; f++) {
      fnfolder.file(o.name+"/"+(f+1)+".mcfunction", fnlist[f]);
    }
  }
  // Include structures
  var strfolder = pack.folder('structures');
  strfolder.file("mapart/azalea_leaves.mcstructure", Structures.azalea_leaves, {base64:true});
  strfolder.file("mapart/glow_lichen.mcstructure", Structures.glow_lichen, {base64:true});
  strfolder.file("mapart/glowstone.mcstructure", Structures.glowstone, {base64:true});
  if (strucs) {
    Colours.forEach(function(value, key){
      strfolder.file(`mapart/${key}.mcstructure`, value.structure, {base64:true});
    })
  }
  // Prepare the ZIP file for download
  pack.generateAsync({type:"blob"})
    .then(function(blob) {
        setSaveAsZip(blob);
        $("#spinnerModal").addClass('d-none');
        $("#spinnerModal").removeClass('d-block');
    }, function (err) {
        alert("Uh oh\nSomething went wrong !");
        console.error("Unexpected error creating blob : \n", err);
        $("#spinnerModal").addClass('d-none');
        $("#spinnerModal").removeClass('d-block');
  });
  pack.generateAsync({type:"base64"})
    .then(function(uri) {
     uri = "data:application/zip;base64," + uri;
      $("#altDownloadPack").click(function(event) {
        event.preventDefault();
        saveAs(uri, "mapart.mcpack");
      })
    }, function(err) {
      alert("Uh oh\nSomething went wrong !");
      console.error("Unexpected error creating Data URL : \n", err);
  });
}


/**
 * Configure download link for the generated ZIP mcpack
 * @param {Blob} blob - ZIP file data in Blob format
 */
function setSaveAsZip(blob) {
  $("#packActionsPreProcess").addClass('d-none');
  $("#packActionsPostProcess").removeClass('d-none');
  $("#downloadPackBtn").click(function() {
    saveAs(blob, "mapart.mcpack");
  });
}

/** Reset the generate addon form  */
function clearBehaviourPack() {
  $("#packActionsPostProcess").addClass('d-none');
  $("#packActionsPreProcess").removeClass('d-none');
  $("#downloadPackBtn").off("click");
  $("#altDownloadPack").off("click");
  $("#packForm")[0].reset();
}


/**
 * Add the UI pane in which the survival guide for an image can be generated, 
 * after the image form data has been processed.
 * @param {string} uid - The image for which to generate the guide.
 */
function addSurvGuideGenerator(uid) {
  let fname = $("#fnNameInput_"+uid).val();
  let big = $("input[name='mapsizeopt_"+uid+"']:checked").val();
  big = Number(big[0]) * Number(big[2]); // Additional warning for large picures
  $("#guideTabsContainer").append(ejs.render(EJStemplates.guideTab, 
      {uid:uid, fname:fname, big: (big > 6)}));
  
  $("#guideTabList").append(ejs.render(EJStemplates.guideNavTab,
      {uid:uid, fname:fname}));
  
  $("#deleteGuide_"+uid).click( function(){deleteSurvivalGuide(uid);} );
  
  $("#genGuideBtn_"+uid).click(function() { 
    $("#spinnerModal").addClass('d-block'); $("#spinnerModal").removeClass('d-none');
    setTimeout( function() {
      createSurvivalGuide(uid, 2*big); 
      $("#spinnerModal").addClass('d-none'); $("#spinnerModal").removeClass('d-block');
    }); // Timeout to let "processing.." modal become visible; page appears to freeze otherwise
  });
  $("#guidelink_"+uid+" a").click();
}

/**
 * Create the survival guide for an image, displaying the block counts used and placement.
 * @param {string} uid - The image for which to generate the guide.
 * @param {Number} numzones - The number of zones in the image, 1 pane will be created for each
 *  (see function `getSurvivalGuideTableData`).
 */
function createSurvivalGuide(uid, numzones) {
  $("#survGuidePlaceholderText").html(EJStemplates.survivalGuideInfo);
  
  // Add the html string to DOM
  $("#guideTab_"+uid).html(
    ejs.render(EJStemplates.survivalGuide, getSurvivalGuideTableData(uid)));

  $(`#guidePageBar_${uid} li.page-item`).click(function() {
    switchActiveGuidePage(this);
  });

  /* Keeping 16,000+ popovers at once = horrible performance. 
  Hence create and destroy active one each time while focused */
  $(`.guide-tableareas td`).focus(function() {
    $(this).data('toggle', 'popover');
    $(this).popover('show');
  });
  $(`.guide-tableareas td`).blur(function() {
    $(this).popover('dispose');
    $(this).removeData('toggle');
  });
  // Bind count control checkboxes
  for (let i=0; i<numzones; i++) {
    $(`#guideTotalBlockCount_${i}_${uid}`).click( function() {
      toggleCountListView(uid, 
        numzones, 
        $(this).prop('checked'), 
        $(`#guideStackViewCount_${i}_${uid}`).prop('checked'))
    });
    $(`#guideStackViewCount_${i}_${uid}`).click( function() {
      toggleCountListView(uid, 
        numzones, 
        $(`#guideTotalBlockCount_${i}_${uid}`).prop('checked'), 
        $(this).prop('checked'))
    });
  }
  // Make page 1 visible & active
  $(`#guidePageBar_${uid} li.page-item`).eq(1).click();
  $(`#guidePage_1_map_${uid}`).addClass("show");
}

/**
 * Show/hide the appropriate columns in each of the tables that list block counts
 * within a survival guide.
 * @param {string} uid - The guide to be modified.
 * @param {Number} l - Number of panes containing count list tables in this guide
 * @param {Boolean} showTotal - Whether to display the total count column
 * @param {Boolean} showStacks - Whether to display the count in stacks column
 */
function toggleCountListView(uid, l, showTotal, showStacks) {
  // Show the correct column in countlist table
  for (let i=0; i<l; i++) {
    $(`#guideTotalBlockCount_${i}_${uid}`).prop('checked', showTotal)
    $(`#guideStackViewCount_${i}_${uid}`).prop('checked', showStacks)
    $(`#countlistTable_${i}_${uid} tr > *:nth-child(2)`).addClass('d-none');
    $(`#countlistTable_${i}_${uid} tr > *:nth-child(3)`).addClass('d-none');
    $(`#countlistTable_${i}_${uid} tr > *:nth-child(4)`).addClass('d-none');
    $(`#countlistTable_${i}_${uid} tr > *:nth-child(5)`).addClass('d-none');
    var n = (showTotal) ? ((showStacks) ? 5 : 4) : ((showStacks) ? 3 : 2);
    $(`#countlistTable_${i}_${uid} tr > *:nth-child(${n})`).removeClass('d-none');
  }
}

/**
 * Highlight the current page number in the navbar listing the survival guide's zones/pages.
 * @param {HTMLElement} pagelink - Button for the page number that was clicked in the navbar.
 */
function switchActiveGuidePage(pagelink) {
  // Pagination active status does not change automatically
  let off = $(pagelink).hasClass("active");
  $(pagelink).closest("ul").find("li.active").removeClass('active');
  if (!off) {
    $(pagelink).addClass('active');
  }
}

/**
 * Remove a survival guide, permanently or clear it to be re-generated.
 * @param {string} uid - The guide to be removed.
 * @param {Boolean} readd - Whether to call `addSurvGuideGenerator` after deletion.
 */
function deleteSurvivalGuide(uid, readd=false) {
  $("#spinnerModal").addClass('d-block'); $("#spinnerModal").removeClass('d-none');
  setTimeout( function() {
    $("#guideTab_"+uid).remove();
    $("#guidelink_"+uid).remove();
    $("#guideTabList a.nav-link").first().click();
    $("#spinnerModal").addClass('d-none'); $("#spinnerModal").removeClass('d-block');
    if (readd) {
      addSurvGuideGenerator(uid);
    }
  });
}
