//check online status
window.addEventListener('online', checkStorage);
window.addEventListener('load', checkStorage);

//Get URL Parameters
let getUrlParameter = function getUrlParameter(sParam) {
    let sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

function check_form() {
    let validator = jQuery('#contact-form').validate();
    let status = validator.form()
    if( status ) {
        get_data();
    }
    translate_form_strings()
}

function storeData(data) {
  // save data in localStorage

  if (typeof Storage !== 'undefined') {
    const formToken = new URLSearchParams(location.search).get('token');
    const time = + new Date()
    const key = `${formToken}_${time}`;

    localStorage.setItem(key, JSON.stringify(data));
    //reenable the submit button if the data is saved.
    document.querySelector('#submit-button').disabled = false;
    document.querySelector("#submit-button-container .spinner").remove()
    return true;
  }
  return false;
}

async function submit_form(data) {
  return fetch(window.SETTINGS.rest_url + 'dt-public/v1/webform/form_submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: data
  })
  .then((data) => {
    if (data.status == 200) {
      return data.status;
    } else {
      throw new Error(data.status);
    }
  })
  .catch((error) => {
    console.error('Error');
    console.error(error);
    return null;
  });
}

function get_data() {
  var submitButtonContainer = document.querySelector('#submit-button-container');
  var submitButton = document.querySelector('#submit-button');

  jQuery('#submit-button').prop('disabled', true )

  submitButton.disabled = true;
  submitButtonContainer.insertAdjacentHTML("beforeend", window.SETTINGS.spinner);
  let data = {};

  jQuery('.single-checkbox input[type=checkbox]:checked').each(function() {
      data[this.name] = jQuery(this).val();
  });
  jQuery('fieldset input[type=checkbox]:checked').each(function(i,v) {
    if (typeof data[v.name] === 'undefined' ){
      data[v.name] = []
    }
    data[v.name].push(v.value);
  });
  jQuery(':input[type=radio]:checked').each(function() {
    data[this.name] = jQuery(this).val();
  });
  jQuery(':input:not([type=checkbox]):not([type=radio]):not(.ignore)').each(function() {
      data[this.name] = jQuery(this).val();
  });
  let location = jQuery('.location')
  if ( location.length ) {
    data.location = {}
    data.location.lat = ''
    data.location.lng = ''
    data.location.level = ''
    data.location.label = ''
    location.each(function() {
      data.location[jQuery(this).data('type')] = jQuery(this).text()
    })
  }

  if (!navigator.onLine) {
    // user is offline, store data locally
    const stored = storeData(data);
    let message = '<strong>You appear to be offline right now. </strong>';
    if (stored) {
      message += 'Your data was saved and will be submitted once you come back online.';

      document.querySelector("#offlineWarningContainer").innerText = offlineCountMessage(offlineCount())
    }
    jQuery("#submit-button-container .spinner").remove();
    document.querySelector("form").reset();

    removeOfflineWarning();

    submitButtonContainer.insertAdjacentHTML("beforeend", `<div class="offlineWarning">${message}</div>`);
    setTimeout(removeOfflineWarning, 2000);

  } else {
    submit_form(JSON.stringify(data)).then((response) => {
      submitButton.disabled = false;
      jQuery("#submit-button-container .spinner").remove()
      if ( response ){
        jQuery('#contact-form').html(window.TRANSLATION.success)
      } else {
        jQuery('.form-submit-error').html(window.TRANSLATION.failure)
      }
    });
  }
}

function removeOfflineWarning() {
  if (document.querySelector(".offlineWarning")) {
    document.querySelector(".offlineWarning").remove();
  }
}

function offlineCount() {
  const token = new URLSearchParams(location.search).get('token');
  let offlineCount = 0;

  for (let i=0; i< localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key.includes(token)) {
      offlineCount++
    }
  }

  return offlineCount;
}

function offlineCountMessage(offlineCount) {
  let message;
  if (offlineCount == 1) {
    message = `You have ${offlineCount} contact stored offline, reconnect to the internet to save this contact`
  }
  else if (offlineCount > 1) {
    message = `You have ${offlineCount} contacts stored offline, reconnect to the internet to save these contact`
  }
  return message ? message : "";
}

function translate_form_strings() {
  jQuery("label:contains('This field is required.')").html(window.TRANSLATION.required)
}

async function checkStorage() {
  // check if we have saved data in localStorage
  if (typeof Storage !== 'undefined') {
    if (offlineCount() > 0) {document.querySelector("#offlineWarningContainer").innerText = offlineCountMessage(offlineCount());}
    const token = new URLSearchParams(location.search).get('token');

    for (let i=0; i< localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key.includes(token)) {
        const fromLocalStore = localStorage.getItem(key);
        if (fromLocalStore) {
        // we have saved form data, try to submit it
        const item = JSON.parse(fromLocalStore);

        submit_form(JSON.stringify(item)).then(function(res) {
            if (res === 200) {
              localStorage.removeItem(key);
              document.querySelector("#offlineWarningContainer").innerText = offlineCountMessage(offlineCount());
            }
          });
        }
      }
    }
  }

}

jQuery(document).ready(function () {

    if ( getUrlParameter('success') ) {
      jQuery('#report').empty().append( `<div id="success">${window.TRANSLATION.success}</div><br>`);
    }

    // check_form()
    translate_form_strings()

    let button = jQuery('#submit-button')
    button.html( window.TRANSLATION.submit ).prop('disabled', true)

    // This is a form delay to discourage robots
    let counter = 5;
    let myInterval = setInterval(function () {
        let button = jQuery('#submit-button')

        button.html( window.TRANSLATION.submit_in + ' ' + counter)
        --counter;

        if ( counter === 0 ) {
            clearInterval(myInterval);
            button.html( window.TRANSLATION.submit ).prop('disabled', false)
        }

      // Enforce check to submit requirements
      enforce_requires_check_to_submit();

    }, 1000);

  function enforce_requires_check_to_submit() {
    jQuery('.input-checkbox').each(function () {
      if (jQuery(this).data('selected') === 'check_to_submit') {
        jQuery('#submit-button').prop('disabled', true);
      }
    });
  }

  jQuery('.input-checkbox').on('click', function () {
    if (jQuery(this).data('selected') === 'check_to_submit') {
      jQuery('#submit-button').prop('disabled', !jQuery(this).prop('checked'));
    }
  });

})
