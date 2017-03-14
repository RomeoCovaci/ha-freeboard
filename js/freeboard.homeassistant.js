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
      }

      doConnection();
    }
}());

// Best to encapsulate your plugin in a closure, although not required.
(function()
{
	// ## A Widget Plugin
	//
	// -------------------
	// ### Widget Definition
	//
	// -------------------
	// **freeboard.loadWidgetPlugin(definition)** tells freeboard that we are giving it a widget plugin. It expects an object with the following:
	freeboard.loadWidgetPlugin({
		// Same stuff here as with datasource plugin.
		"type_name"   : "my_widget_plugin",
		"display_name": "Widget Plugin Example",
        "description" : "Some sort of description <strong>with optional html!</strong>",
		// **external_scripts** : Any external scripts that should be loaded before the plugin instance is created.
		"external_scripts": [
			"http://mydomain.com/myscript1.js", "http://mydomain.com/myscript2.js"
		],
		// **fill_size** : If this is set to true, the widget will fill be allowed to fill the entire space given it, otherwise it will contain an automatic padding of around 10 pixels around it.
		"fill_size" : false,
		"settings"    : [
			{
				"name"        : "the_text",
				"display_name": "Some Text",
				// We'll use a calculated setting because we want what's displayed in this widget to be dynamic based on something changing (like a datasource).
				"type"        : "calculated"
			},
			{
				"name"        : "size",
				"display_name": "Size",
				"type"        : "option",
				"options"     : [
					{
						"name" : "Regular",
						"value": "regular"
					},
					{
						"name" : "Big",
						"value": "big"
					}
				]
			}
		],
		// Same as with datasource plugin, but there is no updateCallback parameter in this case.
		newInstance   : function(settings, newInstanceCallback)
		{
			newInstanceCallback(new myWidgetPlugin(settings));
		}
	});

	// ### Widget Implementation
	//
	// -------------------
	// Here we implement the actual widget plugin. We pass in the settings;
	var myWidgetPlugin = function(settings)
	{
		var self = this;
		var currentSettings = settings;

		// Here we create an element to hold the text we're going to display. We're going to set the value displayed in it below.
		var myTextElement = $("<span></span>");

		// **render(containerElement)** (required) : A public function we must implement that will be called when freeboard wants us to render the contents of our widget. The container element is the DIV that will surround the widget.
		self.render = function(containerElement)
		{
			// Here we append our text element to the widget container element.
			$(containerElement).append(myTextElement);
		}

		// **getHeight()** (required) : A public function we must implement that will be called when freeboard wants to know how big we expect to be when we render, and returns a height. This function will be called any time a user updates their settings (including the first time they create the widget).
		//
		// Note here that the height is not in pixels, but in blocks. A block in freeboard is currently defined as a rectangle that is fixed at 300 pixels wide and around 45 pixels multiplied by the value you return here.
		//
		// Blocks of different sizes may be supported in the future.
		self.getHeight = function()
		{
			if(currentSettings.size == "big")
			{
				return 2;
			}
			else
			{
				return 1;
			}
		}

		// **onSettingsChanged(newSettings)** (required) : A public function we must implement that will be called when a user makes a change to the settings.
		self.onSettingsChanged = function(newSettings)
		{
			// Normally we'd update our text element with the value we defined in the user settings above (the_text), but there is a special case for settings that are of type **"calculated"** -- see below.
			currentSettings = newSettings;
		}

		// **onCalculatedValueChanged(settingName, newValue)** (required) : A public function we must implement that will be called when a calculated value changes. Since calculated values can change at any time (like when a datasource is updated) we handle them in a special callback function here.
		self.onCalculatedValueChanged = function(settingName, newValue)
		{
			// Remember we defined "the_text" up above in our settings.
			if(settingName == "the_text")
			{
				// Here we do the actual update of the value that's displayed in on the screen.
				$(myTextElement).html(newValue);
			}
		}

		// **onDispose()** (required) : Same as with datasource plugins.
		self.onDispose = function()
		{
		}
	}
}());
