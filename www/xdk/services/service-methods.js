/*xdk-auto-gen:service-methods:common:start:f3ebae03a05c49d6b23a72e96ddafbfb*/

var intel;
if (!intel) intel = {};
if (typeof intel !== "object") throw new Error("Unexpected use of intel namespace");
if (!intel.xdk) intel.xdk = {};
if (typeof intel.xdk !== "object") throw new Error("Unexpected use of intel.xdk namespace");
if (!intel.xdk.services) intel.xdk.services = {};
if (typeof intel.xdk.services !== "object") throw new Error("Unexpected use of intel.xdk.services namespace");
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
          $(document).off('OAuthSuccess');
          authWindow.close();
          d.resolve(token[1]);
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
            $(authWindow).off('loadstart');
            authWindow.close();
            d.resolve(hash[1]);
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
    })
    .then(function(response){
      return response.access_token;
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
intel.xdk.services.iodocs_.FSDWebsite = ((function (credentials, helpers) {
  var exports = {};
  
  /* Data Feed Function */
  exports.methodA1 = function (params) {
    var url = 'http://example.api/methodA1?api_key_var_name=' + credentials.apiKey;
    return $.ajax({url: url});
  };
  
  exports.methodA1User = function(params) {
    var url = 'http://example.api/methodA1/user/' + params.UserId;
    delete params.UserId;
    if (params) url = url + '?' + $.param(params);
    return $.ajax({url: url, type: 'GET'});
  };
  
  /* OAuth Functions */
  exports.methodA1Authenticate = function(params) {
    // var implicitUrl = 'https://www.exampleurl.com/auth?';
    var url = {
      codeUrl: 'https://www.exampleurl.com/auth?',
      tokenUrl: 'https://www.exampleurl.com/access_token?'
    };
    
    //parameters will vary from service to service
    /* var = implicitParams {
      client_id: credentials.apiKey,
      redirect_uri: params.redirect_uri,
      response_type: params.response_type
    } */
    var urlParams = {
      code: {
        client_id: credentials.apiKey,
        redirect_uri: params.redirect_uri,
        response_type: params.response_type
      },
      token: {
        client_secret: credentials.apiSecret,
        grant_type: 'authorization_code'
      }
    };
    
    //helper oauth functions return access token. check to see if service uses authentication code or implicit oauth
    //return helpers.oauth2Implicit(implicitUrl, implicitParams)
    return helpers.oauth2AuthCode(url, urlParams)
    .then(function(token){
      var db = window.localStorage;
      //'service_access_token' should be unique to each service so that multiple authenticated services can be used
      db.setItem('service_access_token', token);
      return token;
    })
    .fail(function(err){
      console.log(err);
    });
  };
  
  exports.authenticatedMethodA1 = function(params){
    var token = window.localStorage.getItem('service_access_token')
    if (!token) return 'Need access token before making call';
    
    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.example.com/call?' +  $.param(urlParams);
    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return err.responseText;
    });
  };
  
  return exports;
}))(intel.xdk.services.credentials.FSDWebsite,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.sandbox = ((function (credentials) {
  var exports = {};
  exports.GET = function (params) {
    var url = params.URL ;
    return $.ajax({url: url});
  };
  exports.POST = function (params) {
    var url = params.URL ;
    return $.ajax({url: url, type : 'POST'});
  };
  
  return exports;
}))(intel.xdk.services.credentials.sandbox,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.googleplaces = ((function (credentials) {
  var exports = {};
  var baseUrl = 'https://maps.googleapis.com/maps/api/place/';

  function getPlaceData(path, params) {
    params = params || {};
    var url = baseUrl + path + '/json?key=' + credentials.apiKey + '&sensor=false&' + $.param(params);
    return $.ajax({url: url});
  }

  exports.placeSearch = getPlaceData.bind(null, 'nearbysearch');
  exports.textSearch = getPlaceData.bind(null, 'textsearch');
  exports.radarSearch = getPlaceData.bind(null, 'radarsearch');
  exports.placeDetails = getPlaceData.bind(null, 'details');

  return exports;
}))(intel.xdk.services.credentials.googleplaces,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.klout = ((function (credentials) {
  var exports = {};
  var baseUrl = 'http://api.klout.com/v2/';

  function getId(path, params) {
    params = params || {};
    var substring = '/' + params.Id + '?';
    if(params.screenName) {
      substring = '?' + 'screenName=' + params.screenName + '&';
    }
    if(params.KId) {
      substring = '/' + params.KId + '/tw?';
    }
    var url = baseUrl + 'identity.json/' + path + substring + 'key=' + credentials.apiKey;
    return $.ajax({url: url});
  }

  function getUser(path, params) {
    params = params || {};
    if (path) {path = '/' + path; }
    var url = baseUrl + 'user.json/' + params.kloutId +  path + '?key=' + credentials.apiKey;
    return $.ajax({url: url});
  }

  exports.getIdByTwitterId = getId.bind(null, 'tw');
  exports.getIdByGoogle = getId.bind(null, 'gp');
  exports.getIdByInstagram = getId.bind(null, 'ig');
  exports.getIdByTwitterName = getId.bind(null, 'twitter');
  exports.getTwitterIdByKloutId = getId.bind(null, 'klout');
  exports.showUser = getUser.bind(null, '');
  exports.Score = getUser.bind(null, 'score');
  exports.Topics = getUser.bind(null, 'topics');
  exports.Influence = getUser.bind(null, 'influence');

  return exports;
}))(intel.xdk.services.credentials.klout,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.itunes = ((function (credentials, helpers) {
  'use strict';

  var ITUNES = 'https://itunes.apple.com/search?';

  return {
    search: function(params) {
      return $.ajax({
        type: 'GET',
        dataType: 'json',
        url: ITUNES + $.param(params)
      });
    }
  };

})
)(intel.xdk.services.credentials.itunes,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.usatoday = ((function (credentials) {
  var exports = {};
  var baseUrl = 'http://api.usatoday.com/open/';

  function getCensusData(path, params) {
    params = params || {};
    var url = baseUrl + 'census/' + path + '?api_key=' + credentials.apiKey + '&' + $.param(params);
    return $.ajax({url: url});
  }

  exports.getLocations = getCensusData.bind(null, 'locations');
  exports.getEthnicity = getCensusData.bind(null, 'ethnicity');
  exports.getHousing = getCensusData.bind(null, 'housing');
  exports.getPopulation = getCensusData.bind(null, 'population');
  exports.getRace = getCensusData.bind(null, 'race');

  return exports;
}))(intel.xdk.services.credentials.usatoday,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.spotify = ((function (credentials) {
  var exports = {};

  function jsonCleaner(x) {
    var type = typeof x;
    if (x instanceof Array) {
      type = 'array';
    }
    if ((type == 'array') || (type == 'object')) {
      for (k in x) {
        var v = x[k];
        if ((v === '') && (type == 'object')) {
          delete x[k];
        } else {
          jsonCleaner(v);
        }
      }
      return x;
    }
  }

  var searchURL = 'https://api.spotify.com/v1/';

  function getSearchData(path, params) {
    params = jsonCleaner(params);
    var url = searchURL + path + "?" + $.param(params);
    return $.ajax({url: url});
  }

  function getSpecificData(path, params) {
    params = jsonCleaner(params);
    var url = searchURL + path + "/" + params.id;
    return $.ajax({url: url});
  }

  exports.search = getSearchData.bind(null, "search");
  exports.lookupArtist = getSpecificData.bind(null, "artists");
  exports.lookupAlbum = getSpecificData.bind(null, "albums");
  exports.lookupTrack = getSpecificData.bind(null, "tracks");

  return exports;
}))(intel.xdk.services.credentials.spotify,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.rottentomatoes = ((function (credentials) {
  var exports = {};
  var baseUrl = 'http://api.rottentomatoes.com/api/public/v1.0/';
    
  function getList(path, params) {
    params = params || {};
    params.apiKey = credentials.apiKey;
    var url = baseUrl + path + '.json?' + $.param(params);
    return $.ajax({url: url, dataType: "json"});
  }

  function getDetailedInfo(path, params) {
    params = params || {};
    params.apiKey = credentials.apiKey;
    var url = baseUrl + 'movies/' + params.id + path + '.json?';
    var params_temp = {};
    for (var prop in params) {
      if((prop!='id') && Object.prototype.hasOwnProperty.call(params,prop)){
        params_temp[prop] = params[prop];  
      }
    }
    url = url + $.param(params_temp);
    return $.ajax({url: url, dataType: "json"});
  }

  exports.box_office = getList.bind(null, 'lists/movies/box_office');
  exports.in_theatres = getList.bind(null, 'lists/movies/in_theaters');
  exports.opening = getList.bind(null, 'lists/movies/opening');
  exports.upcoming = getList.bind(null, 'lists/movies/upcoming');
  exports.top_rentals = getList.bind(null, 'lists/dvds/top_rentals');
  exports.current_releases = getList.bind(null, 'lists/dvds/current_releases');
  exports.new_releases = getList.bind(null, 'lists/dvds/new_releases');
  exports.upcomingDVD = getList.bind(null, 'lists/dvds/upcoming');
  exports.movie_info = getDetailedInfo.bind(null,'');
  exports.cast_info = getDetailedInfo.bind(null, '/cast');
  exports.movie_clips = getDetailedInfo.bind(null, '/clips');
  exports.movie_reviews = getDetailedInfo.bind(null, '/reviews');
  exports.movie_similar = getDetailedInfo.bind(null, '/similar');
  exports.movie_alias = getList.bind(null, 'movie_alias');
  exports.search = getList.bind(null, 'movies');
  exports.listsDirectory = getList.bind(null, '');
  exports.movieListsDirectory = getList.bind(null, 'lists/movies');
  exports.dvdListsDirectory = getList.bind(null, 'lists/dvds');

  return exports;
}))(intel.xdk.services.credentials.rottentomatoes,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.wunderground = ((function (credentials, helpers) {
  'use strict';

  var API = 'https://api.wunderground.com/api';
  var WU_SETTINGS = ['lang','pws','bestfct'];

  // get a WU API URI from a method name and parameters
  var wu_uri = function(method, params) {
    var key = credentials.apiKey;

    // history and planner methods optionally have a date (method_YYYYMMDD)
    var method = params.date ? (method + '_' + params.date) : method;
    var location = params.query;

    var settings = WU_SETTINGS.reduce(function(memo, setting) {
      var val = params[setting];

      if (val !== undefined && val !== '1') { // pws, bestfct default to 1
        memo += (setting + ':' + val) + '/';
      }

      return memo;
    }, '/');

    return API + '/' + key + '/' + method + settings + 'q/' + location + '.json';
  };

  // get WU API data from a method name and parameters
  var wu_ajax = function(method, params) {
    return $.ajax({
      type: 'GET',
      dataType: 'json',
      url: wu_uri(method, params)
    });
  };

  return [
    'alerts', 'almanac', 'astronomy', 'conditions', 'currenthurricane',
    'forecast', 'forecast10day', 'geolookup', 'hourly', 'hourly10day',
    'rawtide', 'tide', 'webcams', 'yesterday', 'history', 'planner'
  ].reduce(function(exports, method) {
    exports[method] = function(params) {
      return wu_ajax(method, params);
    };

    return exports;
  }, {});

})
)(intel.xdk.services.credentials.wunderground,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.foursquare = ((function (credentials, helpers) {
  var exports = {};
  
  /* helper functions */
  function jsonCleaner(x) {
    var type = typeof x;
    if (x instanceof Array) {
      type = 'array';
    }
    if ((type == 'array') || (type == 'object')) {
      for (k in x) {
        var v = x[k];
        if ((v === '') && (type == 'object')) {
          delete x[k];
        } else {
          jsonCleaner(v);
        }
      }
      return x;
    }
  }
  
  function currentDate(){
    var d = new Date();
    var m = d.getMonth()+1;
    if(m < 10) m = '0'.concat(m);
    return d.getFullYear() + '' + m + '' + d.getDate();
  }

  function getToken() {
    var db = window.localStorage;
    return db.getItem('foursquare_access_token');
  }

  function showError(message){
    alert(message);
    return message;
  }
  
  /* Authentication */
  exports.authenticate = function(params) {
    var url = {codeUrl: 'https://foursquare.com/oauth2/authenticate?',
               tokenUrl: 'https://foursquare.com/oauth2/access_token?'};
    var urlParams = {code: {
                        client_id: credentials.apiKey,
                        redirect_uri: params.redirect_uri,
                        response_type: params.response_type
                     },
                     token: {
                        client_secret: credentials.apiSecret,
                        grant_type: 'authorization_code'
                     }
                    };
    return helpers.oauth2AuthCode(url, urlParams)
    .then(function(token){
      var db = window.localStorage;
      db.setItem('foursquare_access_token', token);
      return token;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  /* Users */
  exports.user = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userLeaderboard = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/leaderboard?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(leaderboard){
      return leaderboard;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userRequests = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/requests?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(requests){
      return requests;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userSearch = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/search?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(leaderboard){
      return leaderboard;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userBadges = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/badges?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userCheckins = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/checkins?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userFriends = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/friends?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userLists = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/lists?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userMayorships = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/mayorships?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userPhotos = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/photos?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userVenueHistory = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/venuehistory?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userApprove = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/approve?' + $.param(urlParams),
      type: 'POST'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userDeny = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/deny?' + $.param(urlParams),
      type: 'POST'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userSetPings = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/setpings?' + $.param(urlParams),
      type: 'POST'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userUnfriend = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/unfriend?' + $.param(urlParams),
      type: 'POST'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userUpdate = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/users/' + params.USER_ID + '/update?' + $.param(urlParams),
      type: 'POST'
    })
    .then(function(user){
      return user;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  /* Venue */
  exports.venueDetail = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/venues/' + params.venue_id + '?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(venue){
      return venue;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.venueCategories = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/venues/categories?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(venue){
      return venue;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.venueExplore = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/venues/explore?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(venue){
      return venue;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.venueSearch = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/venues/search?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(venue){
      return venue;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  /* Checkins */
  exports.checkin = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/checkins/' + params.checkin_id + '?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(venue){
      return venue;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.checkinAdd = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/checkins/add?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(venue){
      return venue;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  /* Events */
  exports.events = function(params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    params = jsonCleaner(params);
    var urlParams = $.extend({},{client_id: credentials.apiKey,
                                 client_secret: credentials.apiSecret,
                                 oauth_token: token,
                                 v:currentDate(),
                                 m:'foursquare'}, params);
    return $.ajax({
      url: 'https://api.foursquare.com/v2/events/' + params.event_id + '?' + $.param(urlParams),
      type: 'GET'
    })
    .then(function(venue){
      return venue;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  return exports;
}))(intel.xdk.services.credentials.foursquare,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.MarkitOnDemand = ((function (credentials, helpers) {
  var exports = {};
    
    
    function get_method_call(method_name)
    {
          return function(params) 
          {
            var url = 'http://dev.markitondemand.com/Api/v2/' + method_name + '/json';
            if (params) url = url + '?' + $.param(params);
            return $.ajax({url: url, type: 'GET', dataType:'json'});
          };
    }
  
  
  exports.Lookup           = get_method_call('Lookup');
  exports.Quote            = get_method_call('Quote');
  
  
  
  
  return exports;
}))(intel.xdk.services.credentials.MarkitOnDemand,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.forecast = ((function (credentials, helpers) {
  'use strict';

  var FORECAST = 'https://api.forecast.io';

  var forecast_url = function(method, params) {
    return FORECAST + '/' + method + '/' + credentials.apiKey + '/' +
      params.latitude + ',' + params.longitude + (params.time ? (',' + params.time) : '');
  };

  return {
    forecast: function(params) {
      return $.ajax({
        type: 'GET',
        dataType: 'json',
        url: forecast_url('forecast', params)
      });
    }
  };

})
)(intel.xdk.services.credentials.forecast,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.woot = ((function (credentials, helpers) {
  'use strict';

  var WOOT = 'https://api.woot.com/2';

  var woot_uri = function(method, params) {
    var extra = '';

    if (method === 'offers') {
      extra = '/' + params.id;
      delete params.id;
    }

    return WOOT + '/' + method + extra + '.json?key=' + credentials.apiKey + '&' + $.param(params);
  };

  var woot_ajax = function(method, params) {
    return $.ajax({
      type: 'GET',
      dataType: 'json',
      url: woot_uri(method, params)
    });
  };

  return [
    'events', 'offers', 'monkeychats', 'polls', 'wootcasts'
  ].reduce(function(exports, method) {
    exports[method] = function(params) {
      return woot_ajax(method, params);
    };

    return exports;
  }, {});

})
)(intel.xdk.services.credentials.woot,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.flickr = ((function (credentials, helpers) {
  var exports = {photos:{}, people:{}, galleries:{}, interestingness:{}, photosets:{}};
    
    var utils = {};
    
    utils.sprintf = function(format, etc)
    {
        var arg = arguments;
        var i = 1;
        return format.replace(/%((%)|s)/g, function (m) { return m[2] || arg[i++] ;});
    };
  
    function jsonCleaner(x) 
    {
        var type = typeof x;
        if (x instanceof Array) {
          type = 'array';
        }
        if ((type == 'array') || (type == 'object')) {
          for (var k in x) {
            var v = x[k];
            if ((v === '') && (type == 'object')) {
              delete x[k];
            } else {
              jsonCleaner(v);
            }
          }
          return x;
        }
    }
    
    /*
     photo_object
        Object
        farm: 3
        id: "14427316793"
        isfamily: 0
        isfriend: 0
        ispublic: 1
        owner: "62591523@N08"
        secret: "e5d42a9a0d"
        server: "2933"
        title: "cat"
    */
    function construct_url(photo_obj)
    {
        //https://farm{farm-id}.staticflickr.com/{server-id}/{id}_{secret}.jpg
        var template = "https://farm%s.staticflickr.com/%s/%s_%s.jpg";
        return utils.sprintf(template, photo_obj.farm, photo_obj.server, photo_obj.id, photo_obj.secret);        
    }
    
    function get_method_call(method_name, append_url)
    {
        return function(params) 
               {
                var url = 'https://api.flickr.com/services/rest/';
                params.method = "flickr." + method_name; 
                params.api_key = credentials.apiKey;
                params.format = "json";
                if (params) url = url + '?' + $.param(jsonCleaner(params));
                var promise =  $.ajax({url: url, type: 'GET', dataType:'jsonp', jsonp:'jsoncallback'});
                if(append_url)
                {
                    return promise.then(function(data)
                          {
                              //data.photos.photo[ {photoObj}...]
                              var photo_obj = data[append_url];
                              $.each(photo_obj.photo, function(index, photo_obj)
                                     {
                                         photo_obj.url = construct_url(photo_obj);
                                     });
                              return data;
                          });
                }
                else
                {
                    return promise; 
                }
              };
    }
  
  exports.photos_search             = get_method_call("photos.search", "photos");
  
  exports.people_getPublicPhotos    = get_method_call("people.getPublicPhotos", "photos");
  exports.people_getPhotosOf        = get_method_call("people.getPhotosOf", "photos");
    
  exports.galleries_getPhotos       = get_method_call("galleries.getPhotos", true);
  exports.galleries_getListForPhoto = get_method_call("galleries.getListForPhoto", false);
  exports.galleries_getList         = get_method_call("galleries.getList", false);
  exports.galleries_getInfo         = get_method_call("galleries.getInfo", false);
    
  exports.interestingness_getList   = get_method_call("interestingness.getList", "photos");
    
  exports.photosets_getPhotos       = get_method_call("photosets.getPhotos", "photoset");
  exports.photosets_getList         = get_method_call("photosets.getList", false);
  exports.photosets_getInfo         = get_method_call("photosets.getInfo", false);
  
  return exports;
}))(intel.xdk.services.credentials.flickr,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.instagram = ((function (credentials, helpers) {
  var exports = {};

  function getToken() {
    var db = window.localStorage;
    return db.getItem('instagram_access_token');
  }

  function showError(message){
    alert(message);
    return message;
  }

  /* Users */
  exports.authenticate = function(params) {
    var url = 'https://instagram.com/oauth/authorize/?';
    var param = {client_id: credentials.apiKey,
                 redirect_uri: params.redirect_uri,
                 response_type: params.response_type};
    return helpers.oauth2Implicit(url, param)
    .then(function(token){
      var db = window.localStorage;
      db.setItem('instagram_access_token', token);
      return token;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.user = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/users/' + params.userId + '?' +  $.param(urlParams);
    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userFeed = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/users/self/feed?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(feed){
      return feed;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.userRecent = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/users/' + params.userId + '/media/recent?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(feed){
      return feed;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.userLiked = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/users/self/media/liked?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(feed){
      return feed;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  exports.userSearch = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/users/search?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  /* Relationships */
  exports.userFollows = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/users/' + params.userId + '/follows?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(feed){
      return feed;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.userFollowedBy = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/users/' + params.userId + '/followed-by?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(feed){
      return feed;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.userRequestedBy = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/users/self/requested-by?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(feed){
      return feed;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.userRelationship = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/users/' + params.userId + '/relationship?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(feed){
      return feed;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  /* Media */
  exports.media = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/media/' + params.mediaId + '?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(feed){
      return feed;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.mediaSearch = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/media/search?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(feed){
      return feed;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.mediaPopular = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/media/popular?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(feed){
      return feed;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  /* Comments */
  exports.mediaComments = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/media/' + params.mediaId + '/comments?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  /* Likes */
  exports.mediaLikes = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/media/' + params.mediaId + '/likes?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };
  
  /* Tags */
  exports.tag = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/tags/' + params.tagName + '?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.tagRecent = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/tags/' + params.tagName + '/media/recent?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.tagSearch = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/tags/search?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  /* Locations */
  exports.location = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/locations/' + params.locationId + '?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.locationRecent = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/locations/' + params.locationId + '/media/recent?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  exports.locationSearch = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/locations/search?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  /* Geographies */
  exports.geoRecent = function(params){
    var token = getToken();
    if (!token) return showError('Need access token before making call');

    var urlParams = $.extend({access_token: token}, params);
    var completeUrl = 'https://api.instagram.com/v1/geographies/' + params.geoId + '/media/recent?' + $.param(urlParams);

    return $.ajax({
      url: completeUrl,
      type: 'GET',
      dataType: 'json'})
    .then(function(response){
      return response;
    })
    .fail(function(err){
      return showError(err.responseText);
    });
  };

  return exports;
}))(intel.xdk.services.credentials.instagram,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.google_analytics = ((function (credentials) {
  var exports = {};
    
  function init() {
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
    ga('create', credentials.apiKey, 'auto');
  }
    
  exports.trackPageView = function(params) {
      init();
      var d = $.Deferred();
      
      if (params.Location) ga('set','location', params.Location);
      if (params.Page) ga('set','page', params.Page);
      if (params.Title) ga('set','title', params.Title);
      ga('send', 'pageview');
      
      d.resolve('Pageview sent!');
      return d.promise();
  };
    
    exports.trackEvent = function(params) {
        init();
        var d = $.Deferred();
        if (params.Label) ga('set','eventLabel', params.Label);
        if (params.Value) ga('set','eventValue', params.Value);
        ga('send', 'event', params.Category, params.Action);
        d.resolve('Check your analytics account');
        return d.promise();
    };

  return exports;
}))(intel.xdk.services.credentials.google_analytics,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.tms = ((function (credentials, helpers) {
  var exports = {};
  
  function jsonCleaner(x) {
    var type = typeof x;
    if (x instanceof Array) {
      type = 'array';
    }
    if ((type == 'array') || (type == 'object')) {
      for (var k in x) {
        var v = x[k];
        if ((v === '') && (type == 'object')) {
          delete x[k];
        } else {
          jsonCleaner(v);
        }
      }
      return x;
    }
  }
  
  

  //a helper function
  exports.dateToISO8601 = function(d)
  {
      return d.toISOString().match(/[^:]*:[^:]*/)[0] + 'Z';
  };
    
  get_tms_iso8601_method = function(endpoint_uri)
  {
      return function(params)
      {
        params = jsonCleaner(params);
        var url = endpoint_uri;
        if(!params.startDateTime) //oddly, startDateTime is required.  
        {
            var now = new Date();
            params.startDateTime = exports.dateToISO8601(now);
        }
        params.api_key = credentials.apiKey;
        url = url + '?' + $.param(params);
        return $.ajax({url: url, type: 'GET'});
      };
  };
    
  exports.movieShowings = function(params) {
        params = jsonCleaner(params);
        var url = 'http://data.tmsapi.com/v1/movies/showings';
        if(!params.startDate) //oddly, startDate is required.  
        {
            var now = new Date();
            var now_str = now.toISOString();
            params.startDate = now_str.match(/[^T]*/)[0];
        }
        params.api_key = credentials.apiKey;
        url = url + '?' + $.param(params);
        return $.ajax({url: url, type: 'GET'});
  };
    
  exports.newShowAirings = get_tms_iso8601_method('http://data.tmsapi.com/v1/programs/newShowAirings');
    
  exports.movieAirings = get_tms_iso8601_method('http://data.tmsapi.com/v1/movies/airings');
    

  exports.sportEventAirings = function(params)
  {
    params = jsonCleaner(params);
    var url = 'http://data.tmsapi.com/v1/sports/';
    url += params.sportsId;
    delete params.sportsId;
    url += '/events/airings';
      
    if(!params.startDateTime) //oddly, startDateTime is required.  
    {
        var now = new Date();
        params.startDateTime = exports.dateToISO8601(now);
    }
    params.api_key = credentials.apiKey;
    url = url + '?' + $.param(params);
    return $.ajax({url: url, type: 'GET'});
  };

    /*
  exports.newShowAirings = function(params) {
        params = jsonCleaner(params);
        var url = 'http://data.tmsapi.com/v1/programs/newShowAirings';
        if(!params.startDateTime) //oddly, startDateTime is required.  
        {
            var now = new Date();
            params.startDateTime = exports.dateToISO8601(now);
        }
        params.api_key = credentials.apiKey;
        url = url + '?' + $.param(params);
        return $.ajax({url: url, type: 'GET'});
  };
    */
  
  
  
  
  return exports;
}))(intel.xdk.services.credentials.tms,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.kinvey = ((function (credentials) {
  var exports = {};
  var isInit;

  /*Only Init*/
  function kinveyInit() {
    if(isInit) return emptyPromise();
    return kinveyToJqueryProm(Kinvey.init.bind(Kinvey,{appKey : credentials.apiKey, appSecret: credentials.apiSecret}))
    .then(function (result) {
      if(result) {isInit = true;}
      return result || {result: null};
    })
    .fail(function (err) {
      isInit = false
      return err.name + ' : ' + err.description + '\n' + err.debug;
    });
  }
  
  function emptyPromise(){
    var deferred = $.Deferred();
    deferred.resolve();
    return deferred.promise();
  }
  
  /*Init and then do the passed function. isSpecial = true, if passed function is not a kinvey promise;else false.*/
  function initThenCall(func, isSpecial) {
    isSpecial = isSpecial || false;
    return kinveyInit()
    .then(function (response)
    {
      if(isSpecial) {return func();}
      else{ return kinveyToJqueryProm(func);}
    })
    .fail(function(err){
      return err.name + ' : ' + err.description + '\n' + err.debug;
    })
  }

  function kinveyToJqueryProm(func, params) {
    var deferred = $.Deferred();
    func()
    .then(function (response) {
      deferred.resolve(response || true );
    }, function(err) {
      deferred.reject(err.name + ' : ' + err.description + '\n' + err.debug);
    }); 
    return deferred.promise();
  }
  
  function getActiveUser_() {
    var user = Kinvey.getActiveUser();
    if(null !== user) { return user; }
    else { return {result : null}; }
  }

  function logout_() {
    var user = Kinvey.getActiveUser();
    if(null !== user) { return Kinvey.User.logout() }
    else { return {result : null}; }
  }

  function verificationStatus_() {
    var user = Kinvey.getActiveUser();
    if(null !== user) { 
      emailStatus = new Kinvey.Metadata(user).getEmailVerification();
      return { status : emailStatus };
    }
    else { return {result : null}; }
  }
  function exists_(params) {
    return Kinvey.User.exists(params.username)
    .then(function(exists){
      return {result : (exists ? 'true':'false')};   
    });
  }
  function count_(params) {
    return Kinvey.DataStore.count(params.collection_name)
    .then(function(count){
      return {result : count};   
    });
  }

  exports.init = function (params) {
    isInit = false;
    return kinveyInit();
  };
  exports.getActiveUser = function () {
    return initThenCall(
      getActiveUser_.bind(Kinvey),
      true
   );
  };
  exports.signup = function(params) {
    return initThenCall(
      Kinvey.User.signup.bind(Kinvey.User, params)
    );
  };
  exports.destroy = function(params) {
    return initThenCall(
      Kinvey.User.destroy.bind(Kinvey.User, params.user_id)
    );
  };

  exports.login = function(params) {
    return initThenCall(
      Kinvey.User.login.bind(Kinvey.User, params)
    );
  };
  exports.logout = function() {
    return initThenCall(
      logout_.bind(Kinvey)
    );
  };
  exports.verifyEmail = function(params) {
    return initThenCall(
      Kinvey.User.verifyEmail.bind(Kinvey.User, params)
    );
  };
  exports.getActiveUserEmailVerification = function() {
    return initThenCall(
      verificationStatus_.bind(Kinvey),
      true
    );
  };
  exports.resetPassword = function(params) {
    return initThenCall(
      Kinvey.User.resetPassword.bind(Kinvey.User, params)
    );
  };
  exports.forgotUsername = function(params) {
    return initThenCall(
      Kinvey.User.forgotUsername.bind(Kinvey.User, params)
    );
  };
  exports.exists = function(params) {
    return initThenCall(
      exists_.bind(Kinvey.User, params)
    );
  };
  exports.Datastore_save = function (params) {
    var obj = {};
    obj[params.propName] = params.propValue;
    return initThenCall(
      Kinvey.DataStore.save.bind(Kinvey.Datastore, params.collection_name, obj)
    );
  };
  exports.Datastore_update = function (params) {
    var obj = {};
    obj['_id'] = params.entity_id;
    obj[params.propName] = params.propValue;
    return initThenCall(
      Kinvey.DataStore.update.bind(Kinvey.Datastore, params.collection_name, obj)
    );
  };
  exports.Datastore_get = function (params) {
    return initThenCall(
      Kinvey.DataStore.get.bind(Kinvey.Datastore, params.collection_name, params.entity_id)
    );
  };
  exports.Datastore_findAll = function (params) {
    return initThenCall(
      Kinvey.DataStore.find.bind(Kinvey.Datastore, params.collection_name, null)
    );
  };
  exports.Datastore_destroy = function (params) {
    return initThenCall(
      Kinvey.DataStore.destroy.bind(Kinvey.Datastore, params.collection_name, params.entity_id)
    );
  };
  exports.Datastore_clean = function (params) {
    return initThenCall(
      Kinvey.DataStore.clean.bind(Kinvey.Datastore, params.collection_name)
    );
  };
  exports.Datastore_count = function (params) {
    return initThenCall(
      count_.bind(Kinvey.Datastore, params)
    );
  };
  return exports;
}))(intel.xdk.services.credentials.kinvey,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.db_core = ((function (credentials, helpers) {
  var exports = {};
  
  function getToken() {
    return window.localStorage.getItem('dropbox_access_token');
  }

  function showError(message){
    alert(message);
    return message;
  }
  
  /* OAuth 2.0 */
  exports.authorize = function (params) {
    var urls = {codeUrl:'https://www.dropbox.com/1/oauth2/authorize?',
               tokenUrl: 'https://api.dropbox.com/1/oauth2/token?'};
    var urlParams = {
                     code: {
                       client_id: credentials.apiKey,
                       redirect_uri: params.redirect_uri,
                       response_type: params.response_type
                     },
                     token: {
                       client_secret: credentials.apiSecret
                     }
                    };
    
    if (params.state !== '') urlParams.code.state = params.state;
    if (params.force_reapprove !== '') urlParams.code.force_reapprove = params.force_reapprove;
    if (params.disable_signup !== '') urlParams.code.disable_signup = params.disable_signup;
    
    return helpers.oauth2AuthCode(urls, urlParams)
    .then(function(token){
      var db = window.localStorage;
      db.setItem('dropbox_access_token', token);
      return token;
    })
    .fail(function(err){
      alert(err.responseText);
    });
  };
  
  /* Dropbox Accounts */
  exports.accountInfo = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = {oauth_consumer_key: credentials.apiKey,
                     oauth_secret: credentials.apiSecret,
                     access_token: token};
    var url = 'https://api.dropbox.com/1/account/info?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json'
     })
    .then(function(response){
      return response;
    })
    .fail(function(error){
      return error;
    });
  };
  
  /* Files and Metadata */
  exports.metadata = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/metadata/' + params.root + '/' + params.path + '?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json'
     })
    .then(function(metadata){
      return metadata;
    })
    .fail(function(error){
      return error;
    });
  };
  
  exports.delta = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/delta?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json'
     })
    .then(function(response){
      return response;
    })
    .fail(function(error){
      return error;
    });
  };

  exports.longpoll_delta = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api-notify.dropbox.com/1/longpoll_delta?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json'
     })
    .then(function(response){
      return response;
    })
    .fail(function(error){
      return error;
    });
  };

  exports.revisions = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/revisions/' + params.root + '/' + params.path + '?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json'
     })
    .then(function(metadata){
      return metadata;
    })
    .fail(function(error){
      return error;
    });
  };

  exports.restore = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/restore/' + params.root + '/' + params.path + '?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json'
     })
    .then(function(metadata){
      return metadata;
    })
    .fail(function(error){
      return error;
    });
  };

  exports.search = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/search/' + params.root + '/' + params.path + '?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json'
     })
    .then(function(metadata){
      return metadata;
    })
    .fail(function(error){
      return error;
    });
  };

  exports.shares = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/shares/' + params.root + '/' + params.path + '?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json'
     })
    .then(function(metadata){
      return metadata;
    })
    .fail(function(error){
      return error;
    });
  };

  exports.media = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/media/' + params.root + '/' + params.path + '?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json'
     })
    .then(function(metadata){
      return metadata;
    })
    .fail(function(error){
      return error;
    });
  };

  exports.copy_ref = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/copy_ref/' + params.root + '/' + params.path + '?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json'
     })
    .then(function(metadata){
      return metadata;
    })
    .fail(function(error){
      return error;
    });
  };

  /* File Operations */
  exports.copy = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/fileops/copy?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json'
     })
    .then(function(metadata){
      return metadata;
    })
    .fail(function(error){
      return error;
    });
  };

  exports.create_folder = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/fileops/create_folder?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json'
     })
    .then(function(metadata){
      return metadata;
    })
    .fail(function(error){
      return error;
    });
  };

  exports.delete = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/fileops/delete?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json'
     })
    .then(function(metadata){
      return metadata;
    })
    .fail(function(error){
      return error;
    });
  };

  exports.move = function (params) {
    var token = getToken();
    if (!token) return showError('Need access token before making call');
    
    var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
    var url = 'https://api.dropbox.com/1/fileops/move?' + $.param(urlParams);
    return $.ajax({
      url: url,
      type: 'POST',
      dataType: 'json'
     })
    .then(function(metadata){
      return metadata;
    })
    .fail(function(error){
      error.responseText
    });
  };
  
  exports.upload_file = function(params)
  {
      var token = getToken();
      if (!token) return showError('Need access token before making call');
      //params = jsonCleaner(params);
      var file = params.file;
      var path = encodeURI(params.path || file.name);
      delete params.path;
      delete params.file; 

      var urlParams = $.extend({oauth_consumer_key: credentials.apiKey,
                             oauth_secret: credentials.apiSecret,
                             access_token: token}, params);
      var url = 'https://api-content.dropbox.com/1/files_put/auto/' + 
                 path + 
                 '?'  + $.param(urlParams);
      
      if(file == '-')
      {
          var deferred = $.Deferred();
          deferred.resolve({'status':'ok'});
          return deferred.promise();
      }
      else
      {
          //var fd = new FormData();
          //fd.append(path, file);
          return $.ajax({
                  url: url,
                  type: "PUT",
                  data: file,
                  processData: false,  // tell jQuery not to process the data
                  contentType: false   // tell jQuery not to set contentType
                });
      }
  };

  return exports;
}))(intel.xdk.services.credentials.db_core,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.jambase = ((function (credentials, helpers) {
  var exports = {};
    
function jsonCleaner(x) {
    var type = typeof x;
    if (x instanceof Array) {
      type = 'array';
    }
    if ((type == 'array') || (type == 'object')) {
      for (var k in x) {
        var v = x[k];
        if ((v === '') && (type == 'object')) {
          delete x[k];
        } else {
          jsonCleaner(v);
        }
      }
      return x;
    }
  }
  
  /* Data Feed Function */
  exports.methodA1 = function (params) {
    var url = 'http://example.api/methodA1?api_key_var_name=' + credentials.apiKey;
    return $.ajax({url: url});
  };
    
  function get_jambase_handler(endpoint_uri)
  {
      return function(params) {
        params = jsonCleaner(params);
        var url = endpoint_uri; 
        params.api_key = credentials.apiKey;
        url = url + '?' + $.param(params);
        return $.ajax({url: url, type: 'GET'});
      };
  }
    
  //all the 'eventById, eventListByZipcode, etc are just the same endpoint with different param combinations.
  function get_eventBy_method()
  {
      return get_jambase_handler('http://api.jambase.com/events');
  }
  
  function get_artistBy_method()
  {
      return get_jambase_handler('http://api.jambase.com/artists');
  }

  function get_venuesBy_method()
  {
      return get_jambase_handler('http://api.jambase.com/venues');
  }
  
  exports.eventById           = get_eventBy_method();
  exports.eventListByZipcode  = get_eventBy_method()
  exports.eventListByArtistId = get_eventBy_method();
  exports.eventListByVenueId  = get_eventBy_method();

  exports.artistsByName       = get_artistBy_method();
  exports.artistById          = get_artistBy_method();
  
  exports.venuesByName        = get_venuesBy_method();
  exports.venuesByZipcode     = get_venuesBy_method();
  exports.venueById           = get_venuesBy_method();
    
  return exports;
}))(intel.xdk.services.credentials.jambase,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.soundcloud = ((function (credentials, helpers) {
  var exports = {};
  
  function getToken() {
    return window.localStorage.getItem('soundcloud_access_token');
  }

  /* OAuth Functions */
  exports.authenticate = function(params) {
    var url = {
      codeUrl: 'https://soundcloud.com/connect?',
      tokenUrl: 'https://api.soundcloud.com/oauth2/token?'
    };
    
    var urlParams = {
      code: {
        client_id: credentials.apiKey,
        redirect_uri: params.redirect_uri,
        response_type: 'code',
        scope: 'non-expiring',
        display: 'popup'
      },
      token: {
        client_secret: credentials.apiSecret,
        grant_type: 'authorization_code'
      }
    };
    
    return helpers.oauth2AuthCode(url, urlParams)
    .then(function(token){
      var db = window.localStorage;
      db.setItem('soundcloud_access_token', token);
      return token;
    });
  };
  
  exports.users = function(params) {
    var url = 'http://api.soundcloud.com/users/' + params.id + '.json?client_id=' + credentials.apiKey;
    
    return $.ajax({
      url: url,
      type: 'GET'
    });
  }
  
  exports.tracks = function(params) {
    var url = 'http://api.soundcloud.com/tracks/' + params.id + '.json?client_id=' + credentials.apiKey;
    
    return $.ajax({
      url: url,
      type: 'GET'
    });
  }
  
  exports.playlists = function(params) {
    var url = 'http://api.soundcloud.com/playlists/' + params.id + '.json?client_id=' + credentials.apiKey;
    
    return $.ajax({
      url: url,
      type: 'GET'
    });
  }
  
  exports.groups = function(params) {
    var url = 'http://api.soundcloud.com/groups/' + params.id + '.json?client_id=' + credentials.apiKey;
    
    return $.ajax({
      url: url,
      type: 'GET'
    });
  }
  
  exports.comments = function(params) {
    var url = 'http://api.soundcloud.com/comments/' + params.id + '.json?client_id=' + credentials.apiKey;
    
    return $.ajax({
      url: url,
      type: 'GET'
    });
  }
  
  exports.me = function(params){
    var token = getToken();
    var url = 'https://api.soundcloud.com/me.json?oauth_token=' + token;
    return $.ajax({
      url: url,
      type: 'GET'
    });
  }

  exports.meConnections = function(params){
    var token = getToken();
    var url = 'https://api.soundcloud.com/me/connections.json?oauth_token=' + token;
    return $.ajax({
      url: url,
      type: 'GET'
    });
  }

  exports.meActivities = function(params){
    var token = getToken();
    var url = 'https://api.soundcloud.com/me/activities?limit=' + params.limit + '&oauth_token=' + token;
    return $.ajax({
      url: url,
      type: 'GET'
    });
  }

  exports.apps = function(params){
    var token = getToken();
    var url = 'http://api.soundcloud.com/apps/' + params.appId + '/tracks?client_id=' + credentials.apiKey + '&limit=' + params.limit;
    return $.ajax({
      url: url,
      type: 'GET'
    });
  }
  
  return exports;
}))(intel.xdk.services.credentials.soundcloud,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.mapquest = ((function (credentials, helpers) {
  'use strict';

  var MAPQUEST = 'https://www.mapquestapi.com/traffic/v2/';

  return {
    incidents: function(params) {
      var url = MAPQUEST + 'incidents?inFormat=kvp&key=' + credentials.apiKey;
      url += '&boundingBox=' + params.boundingBox;
      url += '&incidents=';

      var incidents = {
        incidents: params.incidents,
        construction: params.construction,
        event: params.event,
        congestion: params.congestion
      };

      url += Object.keys(incidents).filter(function(incident) {
        return incidents[incident] === 'true';
      }).join(',');

      return $.ajax({
        type: 'GET',
        url:  url
      });
    }
  };

})
)(intel.xdk.services.credentials.mapquest,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.Weibo = ((function (credentials, helpers) {
  var exports = {};
  
  function getCachedToken () {
    if ($.jStorage && $.jStorage.storageAvailable()) {
      return $.jStorage.get("intel_xdk_services_sina_weibo_access_token_");
    }
    return null;
  }
  
  function showError(msg) {
    alert(msg);
    return msg;
  }
  
  exports.get_access_token = function(params) {
    var url = {
      codeUrl: 'https://api.weibo.com/oauth2/authorize?',
      tokenUrl: 'https://api.weibo.com/oauth2/access_token?'
    };
    var deferred = $.Deferred();
    
    var jStorageAvailable = false, keyName, accessToken;
    if ($.jStorage && $.jStorage.storageAvailable()) {
      jStorageAvailable = true;
      keyName = "intel_xdk_services_sina_weibo_access_token_";
      accessToken = $.jStorage.get(keyName);
      if (accessToken) {
        deferred.resolve({access_token: accessToken});
        return deferred.promise();
      }
    }
    
    var urlParams = {
      code: {
        client_id: credentials.apiKey,
        redirect_uri: params.redirect_uri,
        response_type: "code",
        scope: params.scope,
        forcelogin: params.forcelogin
      },
      token: {
        client_id: credentials.apiKey,
        client_secret: credentials.apiSecret,
        grant_type: 'authorization_code'
      }
    };
    
    //helper oauth functions return access token. check to see if service uses authentication code or implicit oauth
    
    helpers.oauth2AuthCode(url, urlParams)
    .then(function(access_token){
      if (jStorageAvailable) {
        $.jStorage.set(keyName, access_token, {TTL: 24 * 3600 * 1000});
      }
      deferred.resolve({ access_token: access_token });
    })
    .fail(function(err){
      deferred.reject(err);
    });
    
    return deferred.promise();
  };
  
  exports.update = function(params) {
    var filteredParams = {}, d = $.Deferred();
    for (var k in params) {
      if (params.hasOwnProperty(k) && params[k]) {
        filteredParams[k] = params[k];
      }
    }
    
    var access_token;
    if (!filteredParams.access_token) {
      access_token= getCachedToken();
      if (!access_token) {
        d.reject(showError("Need access token before making call"));
        return d.promise();
      } else {
        filteredParams.access_token = access_token;
      }
    }
    var url = "https://api.weibo.com/2/statuses/update.json";
    return $.ajax({
      url: url,
      type: 'POST',
      data: filteredParams
    });
  };
  
  exports.upload = function(params) {
    var d = $.Deferred();
    var access_token;
    if (!params.access_token) {
      access_token = getCachedToken();
      if (!access_token) {
        d.reject(showError("Need access token before making call"));
        return d.promise();
      } else {
        params.access_token = access_token;
      }
    }
    var url = "https://upload.api.weibo.com/2/statuses/upload.json";
    var fd;

    if(params.pic == '-')
    {
      d.resolve({'status':'ok'});
      return d.promise();
    }

    fd = new FormData();
    for (var i in params) {
      if (params.hasOwnProperty(i) && params[i]) {
        fd.append(i, params[i]);
      }
    }

    return $.ajax({
      url: url,
      type: "POST",
      data: fd,
      processData: false,  // tell jQuery not to process the data
      contentType: false   // tell jQuery not to set contentType
    });
  };
  
  return exports;
}))(intel.xdk.services.credentials.Weibo,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.BaiduMap = ((function (credentials, helpers) {
    var exports = {};
    exports.getIPLocation = function (params) {
        var url = 'http://api.map.baidu.com/location/ip?ak=' + credentials.apiKey + '&coor=bd09ll';
        return $.ajax({
            url : url,
            type: 'GET',
            dataType: 'json',
            data: {
                ip: params.ip_address
            }
        });
    };

    exports.enGeoCode = function (params) {
        var url = 'http://api.map.baidu.com/geocoder/v2/?output=json&ak=' + credentials.apiKey;
        return $.ajax({
            url : url,
            type: 'GET',
            dataType: 'json',
            data: {
                address: params.address
            }
        });
    };

    exports.deGeoCode = function (params) {
        var url = 'http://api.map.baidu.com/geocoder/v2/?output=json&ak=' + credentials.apiKey;
        return $.ajax({
            url : url,
            type: 'GET',
            dataType: 'json',
            data: {
                location: params.latitude + ',' + params.longitude
            }
        });
    };

    exports.roundNearBy = function (params) {
        var url = 'http://api.map.baidu.com/place/v2/search?output=json&ak=' + credentials.apiKey;
        return $.ajax({
            url : url,
            type: 'GET',
            dataType: 'json',
            data: {
                location: params.location,
                query: params.query,
                radius: params.radius
            }
        });
    };

    exports.getNearByGrouponInfo = function (params) {
        var url = 'http://api.map.baidu.com/place/v2/eventsearch?event=groupon&output=json&ak=' + credentials.apiKey;
        return $.ajax({
            url : url,
            type: 'GET',
            dataType: 'json',
            data: {
                location: params.location,
                query: params.query,
                region: params.region,
                radius: params.radius,
                page_size: params.page_size
            }
        });
    };

    exports.getPlaceByCity = function (params) {
        var url = 'http://api.map.baidu.com/place/v2/search?output=json&ak=' + credentials.apiKey;
        return $.ajax({
            url : url,
            type: 'GET',
            dataType: 'json',
            data: {
                query: params.query,
                scope: params.scope,
                region: params.region,
                page_num: params.page_num,
                page_size: params.page_size
            }
        });
    };

    exports.getPlacesByRectangleArea = function (params) {
        var url = 'http://api.map.baidu.com/place/v2/search?output=json&ak=' + credentials.apiKey;
        return $.ajax({
            url : url,
            type: 'GET',
            dataType: 'json',
            data: {
                query: params.query,
                scope: params.scope,
                bounds: params.bounds,
                page_num: params.page_num,
                page_size: params.page_size
            }
        });
    };

    exports.getPlacesByRoundArea = function (params) {
        var url = 'http://api.map.baidu.com/place/v2/search?output=json&ak=' + credentials.apiKey;
        return $.ajax({
            url : url,
            type: 'GET',
            dataType: 'json',
            data: {
                query: params.query,
                scope: params.scope,
                location: params.location,
                radius: params.radius,
                page_num: params.page_num,
                page_size: params.page_size
            }
        });
    };

    exports.getDirection = function (params) {
        var url = 'http://api.map.baidu.com/direction/v1?output=json&ak=' + credentials.apiKey;
        return $.ajax({
            url : url,
            type: 'GET',
            dataType: 'json',
            data: {
                mode: params.mode,
                origin: params.origin,
                destination: params.destination,
                region: params.region,
                origin_region: params.origin_region,
                destination_region: params.destination_region,
                tactics: params.tactics
            }
        });
    };

    return exports;
}))(intel.xdk.services.credentials.BaiduMap,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.amazon_product_search = ((function (credentials, helpers) {
  var exports = {};
    
    function jsonCleaner(x) {
    var type = typeof x;
    if (x instanceof Array) {
      type = 'array';
    }
    if ((type == 'array') || (type == 'object')) {
      for (var k in x) {
        var v = x[k];
        if ((v === '') && (type == 'object')) {
          delete x[k];
        } else {
          jsonCleaner(v);
        }
      }
      return x;
    }
  }
  
    function sort_params(params)
    {
        var keys = Object.keys(params);
        keys.sort();
        var newparams  ={}
        keys.forEach(function(k){ newparams[k] = params[k]; });
        return newparams;
    }
    
    function timestamp(date) {
    //var date = new Date();
    var y = date.getUTCFullYear().toString();
    var m = (date.getUTCMonth() + 1).toString();
    var d = date.getUTCDate().toString();
    var h = date.getUTCHours().toString();
    var min = date.getUTCMinutes().toString();
    var s = date.getUTCSeconds().toString();

    if(m.length < 2) { m = "0" + m; }
    if(d.length < 2) { d = "0" + d; }
    if(h.length < 2) { h = "0" + h; }
    if(min.length < 2) { min = "0" + min; }
    if(s.length < 2) { s = "0" + s}

    var date = y + "-" + m + "-" + d;
    var time = h + ":" + min + ":" + s;
    return date + "T" + time + "Z";
}
    
    function sha256(stringToSign, secretKey) 
    {
        var hex = CryptoJS.HmacSHA256(stringToSign, secretKey);
        return hex.toString(CryptoJS.enc.Base64);
    } 
    
    function date_string(now)
    {
        var date_str = now.toISOString().match(/[^T]*/)[0];
        return date_str.replace(/-/g, "");
    }
    
    function get_aws_cs_function(operation)
    {
        return function(params) {
      
                var url = 'http://webservices.amazon.com/onca/xml';
                params = jsonCleaner(params);

                params.Service = 'AWSECommerceService';
                params.Operation = operation;
                params.AWSAccessKeyId = credentials.apiKey;
                var now = new Date();
                params.Timestamp = timestamp(now); //now.toISOString();

                params = sort_params(params);

                var paramString = $.param(params);
                var signingKey = "GET\n" + "webservices.amazon.com\n" + "/onca/xml\n" + paramString;
                var signature = sha256(signingKey, credentials.apiSecret);
                params.Signature = signature;

                url = url + '?' +  $.param(params);
                return $.ajax({url: url, type: 'GET'});
              };
    }
    
    exports.ItemSearch       = get_aws_cs_function('ItemSearch');
    exports.BrowseNodeLookup = get_aws_cs_function('BrowseNodeLookup');
    exports.ItemLookup       = get_aws_cs_function('ItemLookup');
    exports.SimilarityLookup = get_aws_cs_function('SimilarityLookup');
  
    /*
  exports.ItemSearch = function(params) {
      
    var url = 'http://webservices.amazon.com/onca/xml';
    params = jsonCleaner(params);
    
    params.Service = 'AWSECommerceService';
    params.Operation = 'ItemSearch';
    params.AWSAccessKeyId = credentials.apiKey;
    var now = new Date();
    params.Timestamp = timestamp(now); //now.toISOString();
      
    params = sort_params(params);

    var paramString = $.param(params);
    var signingKey = "GET\n" + "webservices.amazon.com\n" + "/onca/xml\n" + paramString;
    var signature = sha256(signingKey, credentials.apiSecret);
    params.Signature = signature;
    
    url = url + '?' +  $.param(params);
    return $.ajax({url: url, type: 'GET'});
  };
  */
    
    function getAmazonItemInfo(barcode) {
    var PrivateKey = "";
    var PublicKey = "";
    var AssociateTag = "";

    var parameters = [];
    parameters.push("AWSAccessKeyId=" + PublicKey);
    parameters.push("ItemId=" + barcode);
    parameters.push("Operation=ItemLookup");
    parameters.push("Service=AWSECommerceService");
    parameters.push("Timestamp=" + encodeURIComponent(timestamp()));
    parameters.push("Version=2011-08-01");
parameters.push("AssociateTag=" + AssociateTag);

    parameters.sort();
    var paramString = parameters.join('&');

    var signingKey = "GET\n" + "webservices.amazon.com\n" + "/onca/xml\n" + paramString

    var signature = sha256(signingKey,PrivateKey);
        signature = encodeURIComponent(signature);

    var amazonUrl =  "http://webservices.amazon.com/onca/xml?" + paramString + "&Signature=" + signature;
    console.log(amazonUrl);
}
  
  
  return exports;
}))(intel.xdk.services.credentials.amazon_product_search,intel.xdk.services.iodocs_.helpers);
intel.xdk.services.iodocs_.youtube = ((function (credentials, helpers) {
  var exports = {};
  var aToken;

  var baseURL = 'https://www.googleapis.com/youtube/v3';
  function getList(path, params){
    params = params || {};
    var paramsExpanded = jsonCleaner(params);
    url = baseURL + '/' + path + '?' + $.param(paramsExpanded) + '&key=' + credentials.apiKey;
    return $.ajax({url: url});
  };
    /* authentication */
  function authenticate(params) {
    if (aToken) {
      var d = $.Deferred();
      d.resolve('Already authenticated');
      return d.promise();
    }
    var url = {codeUrl: 'https://accounts.google.com/o/oauth2/auth?',
               tokenUrl: 'https://accounts.google.com/o/oauth2/token?'};
    var urlParams = {code: {
                        client_id: params.client_id,
                        redirect_uri: params.redirect_uri,
                        response_type: params.response_type,
                        scope: params.scope_list,
                        access_type : 'offline'
                     },
                     token: {
                        client_secret: credentials.apiSecret,
                        grant_type: 'authorization_code'
                     }
                    };
    return helpers.oauth2AuthCode(url, urlParams)
    .then(function(token){
      aToken = token;
      return token;
    })
    .fail(function(err){
      alert(err.responseText);
    });
  };
  function auth_post(func, params) {
    var authParams = {} //TODO
    return exports.authenticate(authParams)
    .then(function (youtube) {
      var paramIn = 'id=' + params.id + ',rating=' + params.rating;
      return youtube.videos().rate(paramIn);
    })
    .fail(function(err){
      alert(err.responseText);
    })

  }

  function jsonCleaner(x) {
    var type = typeof x;
    if (x instanceof Array) {
      type = 'array';
    }
    if ((type == 'array') || (type == 'object')) {
      for (k in x) {
        var v = x[k];
        if ((v === '') && (type == 'object')) {
          delete x[k];
        } else {
          jsonCleaner(v);
        }
      }
      return x;
    }
  }
  
  exports.authenticate = authenticate.bind(null);
  exports.rateVideos = auth_post.bind(null,'rateVideos');
  exports.listActivities = getList.bind(null,'activities');
  exports.listGuideCategories = getList.bind(null,'guideCategories');
  exports.listPlaylistItems = getList.bind(null,'playlistItems');
  exports.listPlaylists = getList.bind(null,'playlists');
  exports.listSearch = getList.bind(null,'search');
  exports.listVideos = getList.bind(null,'videos');
  return exports;
}))(intel.xdk.services.credentials.youtube,intel.xdk.services.iodocs_.helpers);
/*xdk-auto-gen:service-methods:common:end*/
/*xdk-auto-gen:service-methods:fsdWEB:start:5ccf3e71b6cca6f55cc7c30b24c28fa7*/
intel.xdk.services.fsdWEB=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.fsdWEB",intel.xdk.services.iodocs_.sandbox.POST,{URL:"http://www.fsd38.ab.ca/xmlrpc.php",__proto__:{}});
/*xdk-auto-gen:service-methods:fsdWEB:end*/
/*xdk-auto-gen:service-methods:fsdteachingpos:start:9bf2b79954580cfb301d307ab3c750ac*/
intel.xdk.services.fsdteachingpos=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.fsdteachingpos",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/131",__proto__:{}});
/*xdk-auto-gen:service-methods:fsdteachingpos:end*/
/*xdk-auto-gen:service-methods:fsdnews:start:2c2e8770a495d79e8d005d89d137459f*/
intel.xdk.services.fsdnews=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.fsdnews",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/155",__proto__:{}});
/*xdk-auto-gen:service-methods:fsdnews:end*/
/*xdk-auto-gen:service-methods:blog:start:b0407eace74024cf7214d2bd26b3b181*/
intel.xdk.services.blog=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.blog",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts?category=supblog",__proto__:{}});
/*xdk-auto-gen:service-methods:blog:end*/
/*xdk-auto-gen:service-methods:sandboxGET:start:8eab103e50541614d6fd9754b015e26d*/
intel.xdk.services.sandboxGET=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.sandboxGET",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/31",__proto__:{}});
/*xdk-auto-gen:service-methods:sandboxGET:end*/
/*xdk-auto-gen:service-methods:aboutus:start:a06bac9df2157c9f3296770557b01681*/
intel.xdk.services.aboutus=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.aboutus",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/31",__proto__:{}});
/*xdk-auto-gen:service-methods:aboutus:end*/
/*xdk-auto-gen:service-methods:contact:start:d186e14a957711d579e7be953fbec1e5*/
intel.xdk.services.contact=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.contact",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/54",__proto__:{}});
/*xdk-auto-gen:service-methods:contact:end*/
/*xdk-auto-gen:service-methods:studentvoice:start:6a7792b8f045eaa5a01dedf76739fde4*/
intel.xdk.services.studentvoice=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.studentvoice",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/9135",__proto__:{}});
/*xdk-auto-gen:service-methods:studentvoice:end*/
/*xdk-auto-gen:service-methods:engagedlearners:start:fb95345f4fec68f1f5cf641aa35b122b*/
intel.xdk.services.engagedlearners=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.engagedlearners",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/9135",__proto__:{}});
/*xdk-auto-gen:service-methods:engagedlearners:end*/
/*xdk-auto-gen:service-methods:widerange:start:0ce5817eb7253c5c622929b38a428da3*/
intel.xdk.services.widerange=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.widerange",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/9139",__proto__:{}});
/*xdk-auto-gen:service-methods:widerange:end*/
/*xdk-auto-gen:service-methods:staffdev:start:21f9e424323dd479baea835eb2fbaa11*/
intel.xdk.services.staffdev=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.staffdev",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/9141",__proto__:{}});
/*xdk-auto-gen:service-methods:staffdev:end*/
/*xdk-auto-gen:service-methods:newcontact:start:905cf8deadcb4752207f7667bc7f81b5*/
intel.xdk.services.newcontact=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.newcontact",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/9147",__proto__:{}});
/*xdk-auto-gen:service-methods:newcontact:end*/
/*xdk-auto-gen:service-methods:admin:start:02c6ee6262e875f4689f8ff5bacaaec8*/
intel.xdk.services.admin=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.admin",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/136",__proto__:{}});
/*xdk-auto-gen:service-methods:admin:end*/
/*xdk-auto-gen:service-methods:teachingpos:start:c14d7ec4f4f3651303ddcbd2ca09a8f0*/
intel.xdk.services.teachingpos=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.teachingpos",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/131",__proto__:{}});
/*xdk-auto-gen:service-methods:teachingpos:end*/
/*xdk-auto-gen:service-methods:guest:start:0faa34040a7efda89291d5973c54e4d5*/
intel.xdk.services.guest=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.guest",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/5203",__proto__:{}});
/*xdk-auto-gen:service-methods:guest:end*/
/*xdk-auto-gen:service-methods:nonteach:start:0545f888a586bbef6f21ef048c27e812*/
intel.xdk.services.nonteach=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.nonteach",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/133",__proto__:{}});
/*xdk-auto-gen:service-methods:nonteach:end*/
/*xdk-auto-gen:service-methods:teach:start:3c69595a9f371d8a55f7d68e5ac2a112*/
intel.xdk.services.teach=intel.xdk.services.iodocs_.bindCommon.bind(null,"intel.xdk.services.teach",intel.xdk.services.iodocs_.sandbox.GET,{URL:"https://public-api.wordpress.com/rest/v1/sites/www.fsd38.ab.ca/posts/131",__proto__:{}});
/*xdk-auto-gen:service-methods:teach:end*/
