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
