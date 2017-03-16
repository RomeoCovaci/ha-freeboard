(function() {
  freeboard.loadWidgetPlugin({
    "type_name"   : "hass_service_call",
    "display_name": "Home Assistant - Call Service",
    "description" : "Call a Home Assistant service",
    "external_scripts": [],
    // if true, no padding will be placed around the widget
    "fill_size" : false,
    "settings"    : [
      {
        "name"        : "service_name",
        "display_name": "Service to call on click",
        "type"        : "calculated"
      },
      {
        "name"        : "service_args",
        "display_name": "Arguments (JSON)",
        "type"        : "calculated"
      },
      {
        "name"        : "size",
        "display_name": "Size",
        "type"        : "option",
        "options"     : [
          {
            "name" : "Regular (32px)",
            "value": "regular"
          },
          {
            "name" : "Big (64px)",
            "value": "big"
          }
        ]
      },
      {
        "name"        : "button_title",
        "display_name": "Button title (null if none)",
        "type"        : "calculated"
      },
      {
        "name"        : "button_icon",
        "display_name": "Button icon image URL (null if none)",
        "type"        : "calculated"
      }
    ],
    // Same as with datasource plugin, but there is no updateCallback parameter in this case.
    newInstance: function(settings, newInstanceCallback) {
      newInstanceCallback(new HassServiceCallWidgetPlugin(settings));
    }
  });

  var HassServiceCallWidgetPlugin = function(settings) {
    var self = this;
    var currentSettings = settings;

    var element = $("<button><img><div><span></span></div></button>");
    element.addClass("hass_button");
    element.addClass("hass_button_small");
    element.click(function() {
      var svc = self.service_name;
      var args = self.service_args;
      if (!svc)
        return;

      if (!window.haws_connection) {
        console.error("No Home Assistant connection for widget (make sure you have a HAWS datasource configured)!");
        return;
      }

      var svc_domain = HAWS.extractDomain(svc);
      var svc_name = HAWS.extractObjectId(svc);

      window.haws_connection.callService(svc_domain, svc_name, args);
    });

    $('img', element).hide();
    $('span', element).hide();

    self.render = function(containerElement) {
      $(containerElement).append(element);
    }

    // each block height unit is 45px
    self.getHeight = function() {
      if (currentSettings.size == "big") {
        element.removeClass("hass_button_small").addClass("hass_button_big");
        return 2;
      }
      element.removeClass("hass_button_big").addClass("hass_button_small");
      return 1;
    }

    self.onSettingsChanged = function(newSettings) {
      currentSettings = newSettings;
    }

    self.onCalculatedValueChanged = function(settingName, newValue) {
      if (settingName == "button_title") {
        if (newValue) {
          $("span", element).text(newValue).show();
        } else {
          $("span", element).hide();
        }
      } else if (settingName == "button_icon") {
        if (newValue) {
          $("img", element).attr("src", newValue).show();
        } else {
          $("img", element).hide();
        }
      } else if (settingName == "service_name") {
        self["service_name"] = newValue;
      } else if (settingName == "service_args") {
        self["service_args"] = newValue;
      }
    }

    self.onDispose = function() {
    }
  };
}());

// Copyright (c) 2017 Vladimir Vukicevic
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// Freeboard Home Assistant datasource
//
// Entities are available in the data source by their entity ID.
// Their attributes are available by "_attrs" appended to the entity_id.
// The state value is available in the attrs as well under "state".

(function()
{
    freeboard.loadDatasourcePlugin({
	"type_name"   : "hass",
	"display_name": "Home Assistant",
        "description" : "Connects to Home Assistant instance via a WebSocket",
	"external_scripts" : [
	    "js/haws.umd.js"
	],
	"settings"    : [
	    {
		"name"         : "hass_ws_url",
		"display_name" : "Home Assistant WS URL",
		"type"         : "text",
		"default_value": "ws://127.0.0.1:8123/api/websocket",
		"description"  : "The URL to the Home Assistant instance WebSocket API.",
                "required"     : true
	    },
            {
		"name"         : "hass_api_key",
		"display_name" : "Home Assistant Auth Token",
		"type"         : "text",
		"default_value": "",
		"description"  : "Home Assistant API authentication token. (Optional)",
                "required"     : false
            }              
	],
	newInstance: function(settings, newInstanceCallback, updateCallback)
	{
	    newInstanceCallback(new HAWSDatasourcePlugin(settings, updateCallback));
	}
    });

    var HAWSDatasourcePlugin = function(settings, updateCallback)
    {
      var self = this;
      var currentSettings = settings;

      function doConnection() {
        var opts = {};
        if (currentSettings.hass_api_key) {
          opts["authToken"] = currentSettings.hass_api_key;
        }

        console.log("HAWS datasource - connecting to " + currentSettings.hass_ws_url);
	HAWS.createConnection(currentSettings.hass_ws_url, opts).then(function (conn) {
	  self.conn = conn;

          // save the connection for widgets to use
          if (!("haws_connection" in window) || self.owns_global_connection) {
            window["haws_connection"] = conn;
            self.owns_global_connection = true;
          } else {
            console.log("Note: multiple Home Assistant connections are supported, but HA-specific widgets will only use the first");
          }

          // start getting entities
          HAWS.subscribeEntities(conn, function(ents) {
            // if we need to transform the data we can do so here; but for now,
            // we just pass the entities object straight to freeboard
            updateCallback(ents);
          }, "state_changed").then(function(cancelSub) {
            self.cancelSubsription = cancelSub;
          });
	}, function (err) {
	     console.log("HAWS connection failed " + err);
	   }
        );
      }

      self.onSettingsChanged = function(newSettings) {
        if (newSettings.hass_ws_url != currentSettings.hass_ws_url ||
            newSettings.hass_api_key != currentSettings.hass_api_key)
        {
          if (self.conn) {
            self.conn.close();
          }
	  currentSettings = newSettings;
          doConnection();
        }
      }

      self.updateNow = function() {
        // nothing we can do
      }

      self.onDispose = function() {
	if (self.conn) {
	  self.conn.close();
	}
        if (self.owns_global_connection) {
          delete window["haws_connection"];
        }
      }

      doConnection();
    }
}());
