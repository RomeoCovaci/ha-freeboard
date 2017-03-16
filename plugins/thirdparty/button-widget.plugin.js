(function() {	
  var buttonWidget = function (settings) {
    var self = this;
    var currentSettings = settings;
    
    var buttonSrc = "<button type='button' onclick='buttonFunction()''>"+currentSettings.button_name+"</button>";
    var scriptSrc = "<script>\n" +
      "function buttonFunction() {\n" +
      "var xhttp = new XMLHttpRequest();\n";
    if (currentSettings.content_type) {
      scriptSrc += "xhttp.setRequestHeader('Content-Type', " + JSON.stringify(currentSettings.content_type) + ");\n"
    }
    scriptSrc += "xhttp.open('POST', '" + encodeURI(currentSettings.rest_path) + "', true);\n";
    if (currentSettings.post_value) {
      scriptSrc += "xhttp.send(" + JSON.stringify(currentSettings.post_value) + ");\n";
    } else {
      scriptSrc += "xhttp.send();\n";
    }
    scriptSrc += "</script>\n";
    
    function updateState() {
      //TODO: implement changes and re-render button
      
    }

    this.render = function (containerElement) {
      $(containerElement).append($(buttonSrc));
      $(containerElement).append($(scriptSrc));
    }

    this.onSettingsChanged = function (newSettings) {
      currentSettings = newSettings;
      updateState();	
    }

    this.onCalculatedValueChanged = function (settingName, newValue) {
      // no input so no change ever :-)
    }

    this.onDispose = function () {
    }

    this.getHeight = function () {    
      return 1;
    }

    this.onSettingsChanged(settings);
  };

  freeboard.loadWidgetPlugin({
    type_name: "button_widget",
    display_name: "POST Button Widget",
    settings: [
      {
 	name: "button_name",
 	display_name: "Button Name",
 	type: "text"
      },{
 	name: "rest_path",
 	display_name: "REST Path (POST)",
 	type: "text"
      },{
 	name: "content_type",
 	display_name: "Content-Type (optional)",
 	type: "text"
      },{
 	name: "post_value",
 	display_name: "POST Value (optional)",
 	type: "text"
      }
    ],
    newInstance: function (settings, newInstanceCallback) {
      newInstanceCallback(new buttonWidget(settings));
    }
  });
}());
