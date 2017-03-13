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
//
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

      function updateEntityState(entity_id, state, attributes) {
        self.haData[entity_id] = state;
        self.haData[entity_id + "_attrs"] = attributes;
      }

      function doConnection() {
	self.haData = {};

        console.log("HAWS datasource - connecting to " + currentSettings.hass_ws_url);
	HAWS.createConnection(currentSettings.hass_ws_url).then(function (conn) {
	  self.conn = conn;

          // on connection, get all data
          getAllData();

          // then subscribe to change events
          conn.subscribeEvents(function(e) {
            updateEntityState(e.data.entity_id, e.data.new_state.state, e.data.new_state.attributes);
            updateCallback(self.haData);
          }, "state_changed").then(function(cancelSub) {
            console.log("cancelsub", cancelSub);
            self.cancelSubsription = cancelSub;
          });
	}, function (err) {
	     console.log("HAWS connection failed " + err);
	   }
        );
      }

      function getAllData() {
	if (!self.conn) {
	  return;
	}

	var newData = {};
	self.conn.getStates().then(function(entities) {
          console.log(entities);
	  Object.keys(entities).sort().map(
	    function(key) {
              updateEntityState(entities[key].entity_id, entities[key].state, entities[key].attributes);
	    });
	  }, function(err) {
	     console.log("getStates() failed - " + err);
	  });

        self.haData = newData;
	updateCallback(self.haData);
      }

      self.onSettingsChanged = function(newSettings) {
        if (newSettings.hass_ws_url != currentSettings.hass_ws_url) {
          if (self.conn) {
            self.conn.close();
          }
	  currentSettings = newSettings;
          doConnection();
        }
      }

      self.updateNow = function() {
	getAllData();
      }

      self.onDispose = function() {
	if (self.conn) {
	  self.conn.close();
	}
      }

      doConnection();
    }
}());
