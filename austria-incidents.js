// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: magic;

const params = args.widgetParameter

var district = 803
var state = 8

if (params && params.split(';').length == 2) {
    const paramsArray = params.split(';')
    district = paramsArray[0]
    state = params.split(';')[1]
}

let widget = await createWidget()

if (!config.runsInWidget) {
     await widget.presentLarge()
}

// Tell the system to show the widget.
Script.setWidget(widget) 
Script.complete()

async function createWidget() {
    const size = Device.screenResolution().width / 2
    const url = `https://covid-data.arkulp.at/api/retrieveGovData?district=${district}&state=${state}&width=${size}&height=${size}&fontSize=20&lineWidth=4&padding=40;70;20;40`
    const req = new Request(url)
    const image = await req.loadImage(url)

    const widget = new ListWidget()
    widget.backgroundImage = image
    return widget
}

async function downloadImage(imgurl) {
  let imgReq = new Request(imgurl)
  let img = await imgReq.loadImage()
  return img
}