// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, or any plugin's
// vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file. JavaScript code in this file should be added after the last require_* statement.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require rails-ujs
//= require turbolinks
//
// Required by Blacklight
//= require jquery
//= require blacklight/blacklight

//= require_tree .

$(document).on('turbolinks:load', function() {

    $(".view-mode__list").click(function() {
        $('#documents').toggleClass('list-mode', true);
        $(this).toggleClass('active', true);
        $(".view-mode__grid").toggleClass('active', false);
        return false;
    });
    $(".view-mode__grid").click(function() {
        $('#documents').toggleClass('list-mode', false);
        $(this).toggleClass('active', true);
        $(".view-mode__list").toggleClass('active', false);
        return false;
    });

    function closeModal() {
        $('#ajax-modal').removeClass('open');
        $('.reveal-modal').removeClass('open').removeClass('in').hide();
        $('.reveal-modal-bg').hide();
        $('.modal-backdrop').hide();
        $('body').removeClass('modal-open');
    }

    $('body').on('click', '.ajax-modal-close', function () {
        closeModal();
    });

    $('body').on('keyup', function (e) {
        if (e.key === "Escape" && $('body').hasClass('modal-open')) {
            closeModal();   
        }
    });

    $('body').on('submit', 'form.range_limit', function (e) {
        return validateRangeLimits($(this));
    });

    $('body').on('blur', 'form.range_limit input', function (e) {
        validateRangeLimits($(this).parents('form'));
    });

    $('body').on('click', '.facets__rail .btn-show-facets', function (e) {
      $('.facets__rail').addClass('open');
    });

    $('body').on('click', '.facets__rail .btn-hide-facets', function (e) {
      $('.facets__rail').removeClass('open');
    });

    $('body').on('click', '.toggle-minimize-field', function (e) {
      if ($(this).attr('aria-expanded') == 'true') {
        $(this).prev().removeClass('expanded');
        $(this).attr('aria-expanded', 'false');
        $(this).children('.fa').removeClass('fa-caret-up').addClass('fa-caret-down');
      } else {
        $(this).prev().addClass('expanded');
        $(this).attr('aria-expanded', 'true');
        $(this).children('.fa').removeClass('fa-caret-down').addClass('fa-caret-up');
      }
    });

    function launchUserModal(signedInCallback, signedOutCallback) {
      $.ajax({
        url: '/catalog/user_status',
        dataType: 'json',
        success: function (response) {
          if (response.signed_in) {
            $('body').addClass('signed-in').removeClass('signed-out')
            signedInCallback();
          } else {
            $('body').addClass('signed-out').removeClass('signed-in')
            signedOutCallback();
          }
        }
      });
    }

    function launchSignInModal() {
      $.ajax({
        url: $('#sign-in-link').attr('href'),
        success: function (response) {
          $('#sign-in-modal').modal('show');
          $('#sign-in-modal .modal-content').html(response);
        }
      });
    }

    function launchSignUpModal() {
      $.ajax({
        url: $('#sign-in-modal .sign-up-link').attr('href'),
        success: function (response) {
          $('#sign-in-modal .modal-content').html(response);
        }
      });
    }

    function loadMyAccount() {
      window.location.href = '/search_history';
    }
    
    //open sign-in modal
    $('body').on('click', '#sign-in-link', function (e) {
      e.preventDefault();
      launchUserModal(loadMyAccount, launchSignInModal);
    });
  
    //open sign-up modal
    $('body').on('click', '#sign-in-modal .sign-up-link', function (e) {
      e.preventDefault();
      launchUserModal(loadMyAccount, launchSignUpModal);
    });

    function launchSignInWithCallback(callback) {
        $(document).off('sign_in');
        launchSignInModal();
        //on sign-in, perform callback
        $(document).on('sign_in', function (e) {
            callback();
            $(document).off('sign_in');
        });
    }

    //launch list edit modal
    $('body').on('click', '.edit-list', function (e) {
        e.preventDefault();
        $.ajax({
            url: $(this).data('url'),
            success: function (response) {
                $('#manage-modal').modal('show');
                $('#manage-modal .modal-content').html(response);
            }
        });
    });

    function reloadSaveSearchForm(callback) {
      $.ajax({
        url: '/catalog/' + $('#save-search-form').data('search-id') + '/save_search_form',
        success: function (response) {
          $('#save-search-form').html(response);
          callback();
        }
      });
    }

    function submitSaveSearchForm() {
      reloadSaveSearchForm(function () {
        var $form = $('#save-search-form form');
        $.ajax({
          url: $form.attr('action'),
          type: $form.attr('method'),
          dataType: 'html',
          data: $form.serialize(),
          success: function (data) {
            $form.addClass('hidden');
            $form.siblings('.form-confirmation').removeClass('hidden');
          },
        });
      });
    }

    
    //save search ajax submit
    $('body').on('submit', '#save-search-form .button_to', function (e) {
        e.preventDefault();
        var $form = $(this);
        launchUserModal(submitSaveSearchForm, 
          function () {
            //on sign-in reload the save search form and submit
            launchSignInWithCallback(submitSaveSearchForm);
        });
    });
    
    function launchAddToList(itemIds) {
        $.ajax({
            url: '/lists/add_items_form',
            method: 'POST',
            data: { 'item_ids': itemIds },
            headers: {
                Accept: "text/html; charset=utf-8",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            success: function (response) {
                $('#sign-in-modal').modal('show');
                $('#sign-in-modal .modal-content').html(response);
            }
        });
    }

    function launchAddAllToList() {
        var items = [];
        $('.add-to-list').each(function () {
          var itemId = $(this).find('[name="item_id"]').val();
          if (!items.includes(itemId)) {
            items.push(itemId);
          }
        });
        var itemIds = items.join(',');
        launchAddToList(itemIds);
    }

    //launch list edit modal
    $('body').on('click', '.add-all-to-list', function (e) {
      e.preventDefault();
      launchUserModal(launchAddAllToList, function () {
        launchSignInWithCallback(launchAddAllToList);
      });
    });

    $('body').on('submit', '.add-to-list', function (e) {
        e.preventDefault();
        var itemId = $(this).find('[name="item_id"]').val();
        launchUserModal(function () { launchAddToList(itemId); },
          function () { launchSignInWithCallback(function () { launchAddToList(itemId); }) });
    });

    $('body').on('click', '.list-create__add', function (e) {
        e.preventDefault();
        $('.list-create__fields,.list-create__close,.list-create__heading').removeClass('hidden');
        $('.list-create__fields [name="title"]').focus();
        $('.list-create__add').addClass('hidden')
        
    });

    $('body').on('click', '.list-create__close', function (e) {
        e.preventDefault();
        $('.list-create__add').removeClass('hidden').focus();
        $('.list-create__fields,.list-create__close,.list-create__heading').addClass('hidden');
    });
    
    //show delete list form
    $('body').on('click', '.btn-delete-list', function (e) {
        e.preventDefault();
        $(this).parent().addClass('hidden');
        $(this).parent().siblings('.hidden').removeClass('hidden');
    });
    

    //update list ajax submit
    $('body').on('submit', '.list-update', function (e) {
        e.preventDefault();
        var $form = $(this);
        $.ajax({
            url: $form.attr('action'),
            type: $form.attr('method'),
            dataType: 'html',
            data: $form.serialize(),
            success: function (data) {
                window.location.reload();
            },
        });
    });

    //delete list ajax submit
    $('body').on('submit', '.list-delete', function (e) {
        e.preventDefault();
        var $form = $(this);
        $.ajax({
            url: $form.attr('action'),
            type: $form.attr('method'),
            dataType: 'html',
            data: $form.serialize(),
            success: function (data) {
                window.location = '/lists';
            },
        });
    });

    //create list ajax submit
    $('body').on('submit', '.list-create', function (e) {
        e.preventDefault();
        var $form = $(this);
        $.ajax({
            url: $form.attr('action'),
            type: $form.attr('method'),
            dataType: 'json',
            data: $form.serialize(),
            success: function (data) {
                $('#list-menu').collapse('hide')
                var $button = $('<button>').prop('type', 'button').addClass('list-option').attr('data-listid', data.systemId).text(data.setName);
                var $li = $('<li>').append($button);
                $('#list-options').prepend($li);
                $('.list-add-items [name="list_id"]').val(data.systemId);
                $('.list-selector-toggle__text').text(data.setName);
                $('.list-create__fields,.list-create__close,.list-create__heading').addClass('hidden');
                $('.list-create__fields [name="title"]').val('');
                $('.list-create__add').removeClass('hidden');
                $('.list-add-items button[type="submit"]').prop('disabled', false).focus();
            },
        });
    });

    //add items ajax submit
    $('body').on('submit', '.list-add-items', function (e) {
        e.preventDefault();
        var $form = $(this);
        var list_id = $form.find('[name="list_id"]').val();
        var item_ids = $form.find('[name="item_ids"]').val();
        $.ajax({
            url: $form.attr('action'),
            type: $form.attr('method'),
            dataType: 'json',
            data: $form.serialize(),
            success: function (data) {
                $('.add-items-confirmation').removeClass('hidden');
                $('.add-items-wrapper').addClass('hidden');

                $('.add-items-confirmation__link').prop('href', '/lists/' + list_id);
                //$('.add-items-confirmation__link').text(list_id);

                if (item_ids.indexOf(',') > 0) {
                    $('.add-items-confirmation__single').addClass('hidden');
                } else {
                    $('.add-items-confirmation__multiple').addClass('hidden');
                }
            },
        });
    });
    
    //add items list select item
    $('body').on('click', '.list-selector .list-option', function () {
        $('.list-add-items [name="list_id"]').val($(this).data('listid'));
        $('.list-selector-toggle').trigger('click');
        $('.list-selector-toggle__text').text($(this).text());
        $('.list-add-items button[type="submit"]').prop('disabled', false).focus();
    });

    $('#details dd.collapse').on('hide.bs.collapse', function () {
        $(this).prev().find('.field-toggle .fa').removeClass('fa-caret-up').addClass('fa-caret-down');
    });

    function displayFlashMessage(message) {
      var messageHtml = '<div class="alert alert-info">' + message + '<a class="close" data-dismiss="alert" href="#">&times;</a></div>';
      $('#main-flashes .flash_messages').html(messageHtml);
    }

    //sign in form ajax submit
    $('body').on('submit', '#sign-in-modal form.user-sign-in', function (e) {
        e.preventDefault();
        var $form = $(this);
        $form.find('.alert').remove()
        $.ajax({
            url: $form.attr('action'),
            type: $form.attr('method'),
            dataType: 'json',
            data: $form.serialize(),
            success: function (data) {
              displayFlashMessage('Signed in successfully');
              $('body').removeClass('signed-out').addClass('signed-in');
              $('#sign-in-modal').modal('hide');
              $(document).trigger('sign_in');
            },
            error: function (data) {
                var errorMessage = 'Invalid login';
                if (data.responseJSON !== undefined && data.responseJSON.error !== undefined) {
                    errorMessage = data.responseJSON.error;
                }
                $form.prepend('<div class="alert alert-warning">' + errorMessage + '</div>');
                $form.find('[type="submit"]').removeAttr('disabled');
            },
        });
    });

    //sign up form ajax submit
    $('body').on('submit', '#sign-in-modal form.user-sign-up', function (e) {
        e.preventDefault();
        var $form = $(this);
        $form.find('.alert').remove()
        $.ajax({
            url: $form.attr('action'),
            type: $form.attr('method'),
            dataType: 'json',
            data: $form.serialize(),
            success: function (data) {
              displayFlashMessage('Account created successfully');
              $('body').removeClass('signed-out').addClass('signed-in');
              $('#sign-in-modal').modal('hide');
              $(document).trigger('sign_in');
            },
            error: function (data) {
                var errorMessage = 'There was an error with your submission.';
                if (data.responseJSON !== undefined && data.responseJSON.errors !== undefined) {
                    if (data.responseJSON.errors.email !== undefined) {
                        errorMessage += '<br/>Email ' + data.responseJSON.errors.email.join(',');
                    }
                    if (data.responseJSON.errors.password !== undefined) {
                        errorMessage += '<br/>Password ' + data.responseJSON.errors.password.join(',');
                    }
                    if (data.responseJSON.errors.password_confirmation !== undefined) {
                        errorMessage += '<br/>Password Confirmation ' + data.responseJSON.errors.password_confirmation.join(',');
                    }
                }
                $form.prepend('<div class="alert alert-warning">' + errorMessage + '</div>');
                $form.find('[type="submit"]').removeAttr('disabled');
            },
        });
    });

    $('form.range_limit input.form-control').attr('placeholder', 'YYYY');

});

function validateRangeLimits($form) {
    startYear = $form.find('.form-control.range_begin').val();
    endYear = $form.find('.form-control.range_end').val();

    $form.find('.error').remove();

    if (startYear != '' && (isNaN(startYear) || startYear != parseInt(startYear))) {
        $form.append('<span class="error">Please enter a valid start year.</span>');
        return false;
    }

    if (endYear != '' && (isNaN(endYear) || endYear != parseInt(endYear))) {
        $form.append('<span class="error">Please enter a valid end year.</span>');
        return false;
    }
    
    if (startYear != '' && endYear != '' && parseInt(startYear) > parseInt(endYear)) {
        $form.append('<span class="error">End year should be less than or equal start year.</span>');
        return false;
    }
    
    return true;
}

// For blacklight_range_limit built-in JS, if you don't want it you don't need
// this:
//= require 'blacklight_range_limit'

