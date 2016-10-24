/*xdk-auto-gen:service-methods:common:start:72226a1d82dbc019b99500db47656de2*/

var intel;
if (!intel) intel = {};
if (typeof intel !== "object") throw new Error("Unexpected use of intelnamespace");
if (!intel.xdk) intel.xdk = {};
if (typeof intel.xdk !== "object") throw new Error("Unexpected use of intel.xdknamespace");
if (!intel.xdk.services) intel.xdk.services = {};
if (typeof intel.xdk.services !== "object") throw new Error("Unexpected use of intel.xdk.servicesnamespace");
intel.xdk.services.iodocs_ = (function () {
/**
 * @license Copyright 2013 - 2014 Intel Corporation All Rights Reserved.
 *
 * The source code, information and material ("Material") contained herein is owned by Intel Corporation or its
 * suppliers or licensors, and title to such Material remains with Intel Corporation or its suppliers or
 * licensors. The Material contains proprietary information of Intel or its suppliers and licensors. The
 * Material is protected by worldwide copyright laws and treaty provisions. No part of the Material may be used,
 * copied, reproduced, modified, published, uploaded, posted, transmitted, distributed or disclosed in any way
 * without Intel's prior express written permission. No license under any patent, copyright or other intellectual
 * property rights in the Material is granted to or conferred upon you, either expressly, by implication,
 * inducement, estoppel or otherwise. Any license under such intellectual property rights must be express and
 * approved by Intel in writing.
 *
 * Unless otherwise agreed by Intel in writing, you may not remove or alter this notice or any other notice
 * embedded in Materials by Intel or Intel's suppliers or licensors in any way.
 */

/* global X2JS */

/* This file contains helper functions for all api-requests (i.e., data bindings) */
  var exports = {};

  /* Merge the second argument into the first, return the first. A simple version of _.extend() */
  exports.mergeParams = function (params, runtimeParams) {
    runtimeParams = runtimeParams || {};
    for (var p in runtimeParams) {
      if (Object.prototype.hasOwnProperty.call(runtimeParams, p)) {
        params[p] = runtimeParams[p];
      }
    }
    for (p in params) {
      if(params[p] === '') {
        delete params[p];
      }
    }
    return params;
  };

  /* Invoke the given common function, run checks on the result, and run a filter function if provided */
  exports.bindCommon = function (functionName, commonFunc, params, runtimeParams) {
    /* 
     * Pull xdkFilter from runtimeParams, otherwise the filter function may run before
     * the data is returned, which could cause any number of problems
     */
    var filterFunc;
    if (runtimeParams && typeof runtimeParams.xdkFilter === 'function') {
      filterFunc = runtimeParams.xdkFilter;
    }
    if (runtimeParams) {
      delete runtimeParams.xdkFilter;
    }
    var p = commonFunc(exports.mergeParams(params, runtimeParams));
    return p.then(function (data, status, xhr) {
      var finalData = data;
      /* If the returned data is XML, convert it to JSON before sending out */
      if ($.isXMLDoc(data)) {
        var x2j = new X2JS();
        finalData = x2j.xml2json(data);
        finalData.xml2json = true;
      }
      /* If the user passes a filter function, run that filter before returning the response */
      if (filterFunc) finalData = filterFunc(finalData);
      $(document).trigger(functionName, [finalData, status, xhr]);
      return finalData;
    });
  };

  exports.helpers = {};

  /* checks if url for OAuth flow ends with ? */
  function urlChecker(url){
    if (url.substr(-1) !== '?') url = url.concat('?');
    return url;
  }

  /* OAuth 2.0 */

  /**
   * Launches window to input user credential for authentication
   * If already authenticated, then opens and closes window to get code/access_token
   * @param {object} url String containing url used for authentication
   * @param {object} params Object containing parameters passed along with url to authenticate (e.g. client_id, client_secret, etc)
   * @param {string} mode Determines the oauth mode (authCode, implicit, etc)
   */
  function doOAuth2_(url, params, mode){
    var d = $.Deferred();
    var completeUrl = urlChecker(url) + $.param(params);
    var l = params.redirect_uri.length;
    var authWindow = window.open(completeUrl, '_blank', 'location=yes');

    /* services tab */
    $(document).on('OAuthSuccess', function(e){
      //OAuthSuccess event tells us we're at the redirect_uri, so no need to check
      if (mode === 'authCode'){
        var results = {};
        var code, error;
        if (e.originalEvent.detail.result.code){
          code = e.originalEvent.detail.result.code;
        } else if (e.originalEvent.detail.result.error){
          error = e.originalEvent.detail.result.error;
        }
        if (code) results.code = code; //oauth2Callback sends the query string, so no need to parse the url
        if (error) results.error = error;
        $(document).off('OAuthSuccess');
        authWindow.close();
        d.resolve(results);
      } else if (mode === 'implicit'){
        var token = /access_token=([^&]+)/.exec(e.originalEvent.detail.hash);
        if (token) {
          var hashObj = { access_token: token[1] };
          $(document).off('OAuthSuccess');
          authWindow.close();
          d.resolve(hashObj);
        }
      }
    });

    /* emulator and device */
    $(authWindow).on('loadstart', function(e){
      var authUrl = e.originalEvent.url;
      if (authUrl.substring(0, l) === params.redirect_uri) {
        if (mode === 'authCode'){
          var results = {};
          var code = /\?code=(.+)(?=&)|\?code=(.+)(?=#)|\?code=(.+)$/.exec(e.originalEvent.url);
          if (code) results.code = code[1]||code[2]||code[3];
          results.error = /\?error=(.+)$/.exec(e.originalEvent.url);
          $(authWindow).off('loadstart');
          authWindow.close();
          d.resolve(results);
        } else if (mode === 'implicit'){
          var hash = /access_token=([^&]+)/.exec(e.originalEvent.url);
          if (hash) {
            var hashObj = { access_token: hash[1] };
            $(authWindow).off('loadstart');
            authWindow.close();
            d.resolve(hashObj);
          }
        }
      }
    });
    return d.promise();
  }

  /**
   * Achieve authentication using authorization code OAuth2.0
   * @param {object} url Object containing urls used for authentication
   * @param {object} params Object containing parameters passed along with url to authenticate (e.g. client_id, client_secret, etc)
   *
   * @returns {string} Access token used in OAuth 2.0
   */
  exports.helpers.oauth2AuthCode = function (url, params){
    return doOAuth2_(url.codeUrl, params.code, 'authCode')
    .then(function(e){
      if (e.code){
        var tokenParams = {
          code: encodeURIComponent(e.code),
          client_id: params.code.client_id,
          client_secret: params.token.client_secret,
          redirect_uri: params.code.redirect_uri,
          grant_type: 'authorization_code'
        };
        return $.ajax({ //returns response containing access_token
          url: url.tokenUrl,
          type: 'POST',
          contentType: 'application/x-www-form-urlencoded',
          data: tokenParams,
          dataType: 'json',
          headers: {
            Accept : 'application/json'
          }
        });
      } else {
        var d = $.Deferred();
        d.reject(e.error);
        return d.promise();
      }
    });
  };

  /**
   * Achieve authentication using implicit OAuth2.0
   * @param {object} url String containing url used for authentication
   * @param {object} params Object containing parameters passed along with url to authenticate (e.g. client_id, client_secret, etc)
   *
   * @returns {string} Access token used in OAuth 2.0
   */
  exports.helpers.oauth2Implicit = function(url, params){
    return doOAuth2_(url, params, 'implicit');
  };

  /**
   * Achieve authentication using client credential OAuth2.0
   * @param {object} url String containing urls used for authentication
   * @param {object} params Object containing parameters passed along with url to authenticate (e.g. client_id, client_secret, etc)
   *
   * @returns {string} Access token used in OAuth 2.0
   */
  exports.helpers.oauth2CC = function(url, params, header){
    var d = $.Deferred();
    return $.ajax({
      url: urlChecker(url) + $.param(params),
      type: 'POST',
      contentType: 'application/x-www-form-urlencoded;charset=UTF-8',
      headers: {
        'Authorization': header
      },
      data: 'grant_type=client_credentials',
      dataType: 'json'
    })
    .then(function(response){
      d.resolve(response);
      return d.promise();
    });
  };

  return exports;
})();;
/*xdk-auto-gen:service-methods:common:end*/
/*xdk-auto-gen:service-methods:sandbox:start:26400011618626f09fec707818c872d1*/
intel.xdk.services.iodocs_.sandbox=function(e){function s(e){try{return JSON.parse(e)}catch(s){return e}}var d={};return d.RESTAPI=function(e){return $.ajax({url:e.URL,method:e.Method,headers:s(e.Headers),data:s(e.body)})},d}(intel.xdk.services.credentials.sandbox,intel.xdk.services.iodocs_.helpers);
/*xdk-auto-gen:service-methods:sandbox:end*/
/*xdk-auto-gen:service-methods:RSS:start:c537ab3fda270595aa3e1654d0f94090*/
intel.xdk.services.iodocs_.RSS=function(e,i){var s={};return s.Request=function(e){return $.ajax(e)},s}(intel.xdk.services.credentials.RSS,intel.xdk.services.iodocs_.helpers);
/*xdk-auto-gen:service-methods:RSS:end*/
/*xdk-auto-gen:service-methods:blog:start:26e43b9a9aa7445b1aa97721151b16ba*/
intel.xdk.services.blog=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.blog",intel.xdk.services.iodocs_.sandbox.RESTAPI,{Method:"GET",URL:"http://www.fsd38.ab.ca/feed.php",Headers:'{ "Content-Type": "application/json" }',Body:""});
/*xdk-auto-gen:service-methods:blog:end*/
/*xdk-auto-gen:service-methods:blognew:start:21df6ba9b6f8f19b1766961fcd41ba18*/
intel.xdk.services.blognew=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.blognew",intel.xdk.services.iodocs_.sandbox.RESTAPI,{Method:"GET",URL:"http://www.fsd38.ab.ca/feed.php",Headers:'{ "Content-Type": "application/json" }',Body:""});
/*xdk-auto-gen:service-methods:blognew:end*/
/*xdk-auto-gen:service-methods:blognew1:start:ac8ede5ac86562ec0954e68ae4bf4622*/
intel.xdk.services.blognew1=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.blognew1",intel.xdk.services.iodocs_.sandbox.RESTAPI,{Method:"GET",URL:"http://www.fsd38.ab.ca/feed.php",Headers:'{ "Content-Type": "application/json" }',Body:""});
/*xdk-auto-gen:service-methods:blognew1:end*/
/*xdk-auto-gen:service-methods:supportive:start:8228c04f059883e61a3dae5fce7245a5*/
intel.xdk.services.supportive=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.supportive",intel.xdk.services.iodocs_.sandbox.RESTAPI,{Method:"GET",URL:"http://www.fsd38.ab.ca/API.php/341",Headers:"{ }",Body:""});
/*xdk-auto-gen:service-methods:supportive:end*/
/*xdk-auto-gen:service-methods:stuvoice:start:92027c57e0d8fb4428e655bb39306eaa*/
intel.xdk.services.stuvoice=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.stuvoice",intel.xdk.services.iodocs_.sandbox.RESTAPI,{Method:"GET",URL:"http://www.fsd38.ab.ca/API.php/367",Headers:"{ }",Body:""});
/*xdk-auto-gen:service-methods:stuvoice:end*/
