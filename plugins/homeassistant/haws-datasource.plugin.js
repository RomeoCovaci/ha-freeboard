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
