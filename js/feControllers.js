const dur = 0.3;
const timeout = 500;
const longTimeout = timeout * 10;
const interval = 250;
const oneRotation = 360;
const morphRadiusRatio = 5;
const TRANSFORM_ORIGIN = "transform-origin";
const LIGHTING_COLOR = "lighting-color";
const FLOOD_COLOR = "flood-color";
const FLOOD_OPACITY = "flood-opacity";
const CLIP_PATH = "clip-path";
const OVERLAP_THRESHOLD = "20%";

const viewBoxWidth = 700;
const viewBoxHeight = 350;
const gridWidth = 50;
const gridHeight = 50;
const controllerCenter = 25;
const imageArr = [
  "/assets/sketches/Black and Red 02.png",
  "/assets/sketches/Bubbles 2.png",
  "/assets/sketches/Plant 1.png",
  "/assets/sketches/Shapes 1.png",
  "/assets/sketches/Shapes 2.png",
];

let gridRows = 7,
  gridColumns = 14,
  i,
  x,
  y;
const grid = document.getElementById("deadBoard");
const wireLayer = document.getElementById("wireLayer");
const buttonLayer = document.getElementById("newControllerButtonLayer");
const connectorLayer = document.getElementById("connectorLayer");
const socketLayer = document.getElementById("socketLayer");
const controllerLayer = document.getElementById("filterControllerLayer");
const lseLayer = document.getElementById("lseLayer");
const layersToReset = [
  wireLayer,
  buttonLayer,
  connectorLayer,
  controllerLayer,
  lseLayer,
];

const filterDefs = document.getElementById("filterDefs");

const dialogBox = document.getElementById("dialogBox");
const dialogText = document.getElementById("dialogText");
const dialogClose = document.getElementById("dialogClose");

const nextTutorialButton = document.getElementById("nextTutorialButton");

//FIXME: should be in lib
getCssVar = function (value) {
  return window.getComputedStyle(document.body).getPropertyValue(value).trim();
};
//FIXME: should be in lib
randomColor = function () {
  colors = [
    "--R",
    "--G",
    "--B",
    "--A",
    "--yellow",
    "--green-dark",
    "--blue-dark",
  ];
  return getCssVar(gsap.utils.random(colors));
};
//FIXME: should be in lib
nextArrayElement = function (arr, el) {
  return gsap.utils.wrap(arr, arr.indexOf(el) + 1);
};

class Controller {
  constructor(id, index) {
    this.id = id;
    this.initVars();
    this.controllerId = this.id + "Controller";
    this.triggerId = this.id + "Trigger";
    this.initX = controllerArr[index].initX;
    this.initY = controllerArr[index].initY;
    this.controllerArrayIndex = index;
    this.controller = this.createController();
    $(this.controller).addClass("controller");
    // FIXME: figure out why your passing some stuff in as params but not consistently
    this.initController(this.controller, this.initX, this.initY);
    this.toDOM();
  }
  initController(group, xPos, yPos) {
    $(group).data("class", this);
    gsap.set(group, { x: gridWidth * xPos, y: gridHeight * yPos });
  }
  toDOM() {
    console.log(this);
  }
  resetController() {
    setTimeout(() => {
      //needs to grab it by classs so anything attached comes with it
      gsap.to(`.${this.controllerId}`, {
        x: this.initX * gridWidth,
        y: this.initY * gridHeight,
      });
    }, timeout);
  }
  dragController(target, trigger) {
    let thisClass = this;
    return Draggable.create(target, {
      type: "x,y",
      edgeResistance: 0.9,
      bounds: grid,
      inertia: true,
      trigger: trigger,
      snap: {
        x: function (endValue) {
          return Math.round(endValue / gridWidth) * gridWidth;
        },
        y: function (endValue) {
          return Math.round(endValue / gridHeight) * gridHeight;
        },
      },
      onDragEnd: function (e) {
        let feControllersAndSockets = $(".filterElementController").add(
          $(".filterSocket")
        );
        let i = feControllersAndSockets.length;
        while (--i > -1) {
          if (
            this.hitTest(feControllersAndSockets[i], OVERLAP_THRESHOLD) &&
            $(this.target).hasClass("territorial")
          ) {
            thisClass.resetController();
          }
        }
        setTimeout(() => {
          thisClass.wires.forEach((w) => {
            w.reDrawPolyline();
          });
        }, timeout);
      },
    });
  }
  attrKnob(targetId, attribute, params) {
    let thisClass = this;
    let offset = params.offset ?? 0;
    let multiplyer = params.multiplyer ?? 1;

    Draggable.create(targetId, {
      type: "rotation",
      bounds: {
        minRotation: params.minRotation ?? 0,
        maxRotation: params.maxRotation ?? oneRotation,
      },
      onDrag: function () {
        gsap.set(thisClass.fe, {
          attr: {
            [attribute]: (this.rotation + offset) * multiplyer,
          },
        });
      },
    });
  }
  attrSlider(targetId, attribute, params) {
    let thisClass = this;
    let offset = params.offset ?? 0;
    let multiplyer = params.multiplyer ?? 1;
    let type = params.type ?? "x";
    Draggable.create(targetId, {
      type: type,
      bounds: {
        top: params.max ?? 0,
        height: params.min ?? 50,
        left: params.min ?? 0,
        width: params.max ?? 50,
      },
      onDrag: function () {
        gsap.set(thisClass.fe, {
          attr: {
            [attribute]: params.truncate
              ? Math.trunc(
                  ((type == "x" ? this.x : this.y) + offset) * multiplyer
                )
              : ((type == "x" ? this.x : this.y) + offset) * multiplyer,
          },
        });
      },
    });
  }
  createColorPicker(className) {
    let colorPicker = document.createElement("input");
    colorPicker.setAttribute("type", "color");
    colorPicker.setAttribute(
      "class",
      this.controllerId + "ColorPicker colorPicker"
    );
    $(colorPicker).addClass(className);
    colorPicker.setAttribute("value", this.color);
    let fo = createSvgElement("foreignObject");
    fo.appendChild(colorPicker);
    return fo;
  }
  initVars() {
    return null;
  }
}
//filter classes
class FilterElement extends Controller {
  constructor(id, index) {
    super(id, index);
    $(this.controller).addClass("filterElementController");
    $(this.controller).addClass("territorial");
    this.fe = this.createFe();
    this.fe.setAttributeNS(null, "result", this.id);
    this.prev = null;
    this.next = null;
    this.wires = [];
    this.drag();
  }
  toDOM() {
    controllerLayer.appendChild(this.controller);
  }
  drag() {
    super.dragController("." + this.controllerId, "." + this.triggerId);
  }
}

class Morphology extends FilterElement {
  constructor(id, index) {
    super(id, index);
    //FIXME: change the svgOrigin of all of these once outside the class and geti it out of here
    gsap.set(".morphologyRadius", { svgOrigin: "25 25" });
    $("." + this.controllerId).click(() => {
      this.flipOperator(this);
    });
    super.attrKnob("." + this.controllerId + "Radius", "radius", {});
  }
  createController() {
    let g = group({
      class: this.controllerId,
      id: this.controllerId,
    });
    g.appendChild(
      title(
        {},
        {},
        "Morphology: Drag the grey tab to increase growth; click to shrink instead"
      )
    );
    g.appendChild(
      path({
        d: $(".morphologyDilate").attr("d"),
        class: "controllerState",
        fill: "blue",
      })
    );
    g.appendChild(
      path({
        d: $(".morphologyRadius").attr("d"),
        class: this.controllerId + "Radius morphologyRadius",
        fill: "darkgray",
      })
    );
    g.appendChild(
      path({
        d: $(".morphologyTop").attr("d"),
        class: this.triggerId,
        fill: "black",
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feMorphology", {
      id: this.id + "Fe",
      radius: 2,
      operator: "dilate",
    });
  }
  flipOperator(thisClass) {
    //FIXME: switching between gsap and jquery is probably dumb
    let operator =
      $(this.fe).attr("operator") === "dilate" ? "erode" : "dilate";
    gsap.set(this.fe, { attr: { operator: operator } });
    gsap.to(`#${this.controllerId} .controllerState`, {
      duration: dur,
      morphSVG: `#${operator}Path`,
    });
  }
  updateRadius(rotation) {
    gsap.set(this.fe, { attr: { radius: rotation / morphRadiusRatio } });
  }
}

class GaussianBlur extends FilterElement {
  constructor(id, index) {
    super(id, index);
    gsap.set(".controllerGaussianBlurInner", { svgOrigin: "25 25" });
    super.attrKnob(
      "." + this.controllerId + "StdDeviation",
      "stdDeviation",
      {}
    );
  }
  createController() {
    let g = group({
      class: this.controllerId,
      id: this.controllerId,
    });
    g.appendChild(
      title(
        {},
        {},
        "GaussianBlur: Drag the off-center lens to increase or decrease blurriness"
      )
    );
    g.appendChild(
      circle({
        cx: 25,
        cy: 25,
        r: 25,
        class: `controllerGaussianBlurOuter ${this.triggerId}`,
      })
    );
    g.appendChild(
      circle({
        cx: 25,
        cy: 25,
        r: 20,
        class: `controllerGaussianBlurMiddle ${this.triggerId}`,
      })
    );
    g.appendChild(
      circle({
        cx: 25,
        cy: 13,
        r: 10,
        class: `controllerGaussianBlurInner ${this.controllerId}StdDeviation`,
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feGaussianBlur", {
      id: this.id + "Fe",
      edgeMode: "wrap",
      stdDeviation: 5,
    });
  }
}

class DisplacementMap extends FilterElement {
  constructor(id, index) {
    super(id, index);
    $(this.controller).addClass("in2");
    super.attrKnob(`.${this.controllerId}Scale`, "scale", {
      minRotation: -1 * oneRotation,
    });
    this.channelButton("X");
    this.channelButton("Y");
  }
  initVars() {
    this.filterSpecificEnum = ["R", "G", "B", "A"];
    this.xChannelSelector = "R";
    this.yChannelSelector = "R";
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    let thisClass = this;
    g.appendChild(
      title(
        {},
        {},
        "DisplacementMap: Displaces a shape based on the colors plugged into it; press the buttons to change which color value used"
      )
    );
    g.appendChild(
      path({
        d: $("#displacementMapButtonX").attr("d"),
        class: `${this.controllerId}XSelector switch`,
      })
    );
    g.appendChild(
      path({
        d: $("#displacementMapButtonY").attr("d"),
        class: `${this.controllerId}YSelector switch`,
      })
    );
    g.appendChild(
      path({
        d: $("#displacementMapFixtureX").attr("d"),
        class: "fixture",
      })
    );
    g.appendChild(
      path({
        d: $("#displacementMapFixtureY").attr("d"),
        class: "fixture",
      })
    );
    g.appendChild(
      path({
        d: $("#displacementMapMain").attr("d"),
        class: `controllerDisplacementMapMain ${this.triggerId}`,
      })
    );
    function drawIndicators(axis) {
      let channel = group({ class: `${thisClass.controllerId + axis}Channel` });
      thisClass.filterSpecificEnum.forEach((c, index) => {
        let indicator = circle({
          r: 1,
          cy: axis == "X" ? 39 : index * 5 + 10,
          cx: axis == "X" ? index * 5 + 10 : 14,
          class: `${thisClass.controllerId + c} channelIndicator`,
          fill: getCssVar(`--${c}`),
        });
        if (c == thisClass.xChannelSelector)
          $(indicator).addClass("activeChannel");
        channel.appendChild(indicator);
      });
      g.appendChild(channel);
    }
    drawIndicators("X");
    drawIndicators("Y");

    let dial = use({
      href: "#genericDial",
      class: this.controllerId + "Scale",
    });
    gsap.set(dial, { svgOrigin: "25 25", x: 4, y: -4, scale: 2 });
    g.appendChild(dial);
    return g;
  }
  createFe() {
    return createSvgElement("feDisplacementMap", {
      id: this.id + "Fe",
      scale: 250,
      in: "SourceGraphic",
      xChannelSelector: "R",
      yChannelSelector: "R",
    });
  }
  channelButton(axis) {
    $(`.${this.controllerId + axis}Selector`).click((e) => {
      gsap.to(e.target, { duration: dur, scale: 0.5, yoyo: true, repeat: 1 });
      this.nextChannel(axis);
    });
  }
  nextChannel(axis) {
    //TODO: see if this can be done with like  Window[axis] somehow rather than echoing code
    let channel = axis == "X" ? this.xChannelSelector : this.yChannelSelector;
    channel = gsap.utils.wrap(
      this.filterSpecificEnum,
      this.filterSpecificEnum.indexOf(channel) + 1
    );
    if (axis == "X") {
      this.xChannelSelector = channel;
    } else {
      this.yChannelSelector = channel;
    }
    $(`.${this.controllerId + axis}Channel .activeChannel`).removeClass(
      "activeChannel"
    );
    $(
      `.${this.controllerId + axis}Channel .${this.controllerId + channel}`
    ).addClass("activeChannel");

    gsap.set(this.fe, {
      attr: {
        xChannelSelector: this.xChannelSelector,
        yChannelSelector: this.yChannelSelector,
      },
    });
  }
}

class Turbulence extends FilterElement {
  constructor(id, index) {
    super(id, index);
    //FIXME: move this
    gsap.set(".turbulenceTypeSwitch", { svgOrigin: "25 25" });
    $("." + this.controllerId + "TypeSwitch").click(() => {
      this.flipType(this);
    });
    super.attrSlider(`.${this.controllerId}NumOctavesTab`, "numOctaves", {
      type: "y",
      max: -5,
      multiplyer: -0.5,
      offset: -1,
      truncate: true,
    });
    super.attrSlider(`.${this.controllerId}BaseFrequencyTab`, "baseFrequency", {
      type: "y",
      max: 6,
      multiplyer: 1 / 100,
      offset: 0.001,
    });
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      title(
        {},
        "Turbulence: works best when plugged into a DisplacementMap; use the switch to change type and the tabs to change base frequency and the number of octaves"
      )
    );
    let clipPathOctaves = createSvgElement("clipPath", {
      id: `${this.controllerId}NumOctavesClip`,
    });
    clipPathOctaves.appendChild(rect({ x: 0, y: 0, width: 50, height: 25 }));
    g.appendChild(clipPathOctaves);
    let clipPathFrequency = createSvgElement("clipPath", {
      id: `${this.controllerId}BaseFrequencyClip`,
    });
    clipPathFrequency.appendChild(rect({ x: 0, y: 25, width: 50, height: 25 }));
    g.appendChild(clipPathFrequency);
    g.appendChild(
      path({
        class: this.controllerId + "Main turbulenceMain " + this.triggerId,
        d: $("#turbulenceMain").attr("d"),
      })
    );
    g.appendChild(
      path({
        class: this.controllerId + "NumOctavesTab octaveTab",
        d: $("#turbulenceNumOctavesTab").attr("d"),
        [CLIP_PATH]: `url(#${this.controllerId}NumOctavesClip)`,
      })
    );
    g.appendChild(
      path({
        class: this.controllerId + "BaseFrequencyTab baseFrequencyTab",
        d: $("#turbulenceBaseFrequencyTab").attr("d"),
        [CLIP_PATH]: `url(#${this.controllerId}BaseFrequencyClip)`,
      })
    );
    g.appendChild(
      rect({
        class: this.controllerId + "TypeSwitch turbulenceTypeSwitch",
        x: 22,
        y: 23,
        width: 6,
        height: 4,
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feTurbulence", {
      id: this.id + "Fe",
      stitchTile: true,
      numOctaves: 1,
      baseFrequency: 0.014,
      type: "fractalNoise",
    });
  }
  flipType(thisClass) {
    let type =
      $(this.fe).attr("type") == "turbulence" ? "fractalNoise" : "turbulence";
    $(this.fe).attr("type", type);
    gsap.to(`.${this.controllerId}TypeSwitch`, {
      duration: dur,
      rotation: "+=90",
    });
  }
}

class LightingElement extends FilterElement {
  constructor(id, index) {
    super(id, index);
    $(this.controller).addClass("lightingElement");
    $(`.${this.controllerId}ColorPicker`).change((e) => {
      this.changeColor(e.target.value);
    });
  }
  initVars() {
    this.color = randomColor();
    this.lse = null;
  }
  changeColor(color) {
    this.color = color;
    gsap.set(this.fe, { attr: { [LIGHTING_COLOR]: this.color } });
    try {
      gsap.to(`.${this.lse.controllerId} .bulb`, {
        duration: dur,
        fill: this.color,
      });
    } catch {}
  }
}

class SpecularLighting extends LightingElement {
  constructor(id, index) {
    super(id, index);
    super.attrSlider(`.${this.controllerId}Constant`, "specularConstant", {
      type: "y",
      max: 7,
      min: 40,
      multiplyer: -1 / 30,
      offset: -3.1,
    });
    super.attrSlider(`.${this.controllerId}Exponent`, "specularExponent", {
      type: "y",
      max: 7,
      min: 40,
      multiplyer: -1 / 5,
    });
    super.attrSlider(`.${this.controllerId}Scale`, "surfaceScale", {
      type: "y",
      max: 10,
      min: 37,
      multiplyer: -1,
      offset: 14,
    });
  }
  createController() {
    let g = group({
      id: this.controllerId,
      class: `${this.controllerId} specularLighting`,
    });
    g.appendChild(
      title(
        {},
        "SpecularLighting: Adds the shiny high-lights from a light source; must drag a bulb on top for it to work"
      )
    );
    g.appendChild(super.createColorPicker());
    g.appendChild(
      path({
        d: $(".specularLightingMain").attr("d"),
        class: this.triggerId + " specularLightingMain",
      })
    );
    g.appendChild(
      path({ d: $(".specularLightingSocket").attr("d"), class: "lightSocket" })
    );
    g.appendChild(
      line({
        class: this.controllerId + "ConstantBounds sliderBounds",
        x1: 30,
        y1: 46,
        x2: 30,
        y2: 7,
      })
    );
    g.appendChild(
      line({
        class: this.controllerId + "ExponentBounds sliderBounds",
        x1: 38,
        y1: 47,
        x2: 38,
        y2: 6,
      })
    );
    g.appendChild(
      line({
        class: this.controllerId + "ScaleBounds sliderBounds",
        x1: 46,
        y1: 46,
        x2: 46,
        y2: 7,
      })
    );
    g.appendChild(
      path({
        d: $(".specularLightingConstant").attr("d"),
        class: this.controllerId + "Constant slider specularConstant",
      })
    );
    g.appendChild(
      path({
        d: $(".specularLightingExponent").attr("d"),
        class: this.controllerId + "Exponent slider specularExponent",
      })
    );
    g.appendChild(
      path({
        d: $(".specularLightingScale").attr("d"),
        class: this.controllerId + "Scale slider surfaceScale",
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feSpecularLighting", {
      id: this.id + "Fe",
      [LIGHTING_COLOR]: this.color,
      specularConstant: 1,
      specularExponent: 1,
    });
  }
  slide(slider, attribute) {
    //TODO:clean up slider starting positions so theres less offsetting the values
    let thisClass = this;
    let boundEl = $("." + slider + "Bounds")[0];
    let attrOffset = attribute == "specularConstant" ? -0.1 : -1;
    Draggable.create("." + slider, {
      type: "y",
      edgeResistance: 1,
      bounds: boundEl,
      onDrag: function (e) {
        $(thisClass.fe).attr(attribute, (this.y - 2) * attrOffset);
      },
    });
  }
}

class DiffuseLighting extends LightingElement {
  constructor(id, index) {
    super(id, index);
    this.attrSlider(`.${this.controllerId}Scale`, "surfaceScale", {
      min: 10,
      max: 30,
      offset: 3,
    });
    this.attrSlider(`.${this.controllerId}Constant`, "diffuseConstant", {
      min: 10,
      max: 30,
      offset: -1,
      multiplyer: 1 / 5,
    });
  }
  createController() {
    let g = group({
      id: this.controllerId,
      class: `${this.controllerId} diffuseLighting`,
    });
    g.appendChild(
      title(
        {},
        "DiffuseLighting: Adds the soft low-lights from a light source; must drag a bulb on top for it to work"
      )
    );
    g.appendChild(this.createColorPicker());
    g.appendChild(
      path({
        d: $("#diffuseLightingMain").attr("d"),
        class: this.triggerId + " diffuseMain",
      })
    );
    g.appendChild(
      path({ d: $("#diffuseLightingSocket").attr("d"), class: "lightSocket" })
    );
    g.appendChild(
      line({
        x1: 8,
        y1: 35,
        x2: 42,
        y2: 35,
        class: this.controllerId + "ScaleBounds sliderBounds",
      })
    );
    g.appendChild(
      line({
        x1: 8,
        y1: 44,
        x2: 42,
        y2: 44,
        class: this.controllerId + "ConstantBounds sliderBounds",
      })
    );
    g.appendChild(
      path({
        d: $("#diffuseLightingScale").attr("d"),
        class: this.controllerId + "Scale slider",
      })
    );
    g.appendChild(
      path({
        d: $("#diffuseLightingConstant").attr("d"),
        class: this.controllerId + "Constant slider",
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feDiffuseLighting", { id: this.id + "Fe" });
  }
}

class Composite extends FilterElement {
  constructor(id, index) {
    super(id, index);
    $(this.controller).addClass("in2");
    $("#" + this.triggerId + "OperatorSwitch").click(() => {
      this.changeOperator();
    });
  }
  initVars() {
    this.filterSpecificEnum = [
      "over",
      "xor",
      "atop",
      "arithmetic",
      "in",
      "out",
    ];
  }
  createController() {
    let g = group({
      id: this.controllerId,
      class: this.controllerId + " composite",
    });
    g.appendChild(
      title(
        {},
        "Composite: This determines how two colors behave when they overlap; click for different modes"
      )
    );
    g.appendChild(circle({ r: 20, cx: 25, cy: 25, class: this.triggerId }));
    let operatorSwitch = group({
      id: this.controllerId + "OperatorSwitch",
      class: this.controllerId + "OperatorSwitch",
    });
    operatorSwitch.appendChild(
      circle({
        r: 12,
        cx: 25,
        cy: 25,
        class: this.triggerId,
        id: this.triggerId + "OperatorSwitch",
        stroke: "black",
      })
    );
    operatorSwitch.appendChild(
      path({
        d: $("#out").attr("d"),
        class: this.controllerId + "Operator",
      })
    );
    g.appendChild(operatorSwitch);
    return g;
  }
  createFe() {
    return createSvgElement("feComposite", {
      operator: "out",
      k1: 100,
      k2: 1,
      k3: 1,
      k4: 0,
      in: "SourceGraphic",
    });
  }
  changeOperator() {
    let operator = nextArrayElement(
      this.filterSpecificEnum,
      this.fe.getAttributeNS(null, "operator")
    );
    gsap.to("." + this.controllerId + "Operator", {
      duration: dur,
      morphSVG: `#${operator}`,
    });
    gsap.set(this.fe, { attr: { operator: operator } });
  }
}

class Blend extends FilterElement {
  constructor(id, index) {
    super(id, index);
    $(this.controller).addClass("in2");
    $("." + this.controllerId).click(() => {
      gsap.to(this.controller, { duration: dur, rotation: "+=22.5" });
      this.changeMode(this);
    });
  }
  initVars() {
    this.filterSpecificEnum = [
      "normal",
      "screen",
      "multiply",
      "lighten",
      "darken",
      "luminosity",
      "overlay",
      "color-dodge",
      "color-burn",
      "hard-light",
      "soft-light",
      "difference",
      "exclusion",
      "hue",
      "saturation",
      "color",
    ];
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      title(
        {},
        "Blend: This determines how two colors behave when they overlap; click for different modes"
      )
    );
    gsap.set(g, { svgOrigin: "25 25" });
    g.appendChild(
      circle({ class: `${this.triggerId} blend`, r: 15, cx: 25, cy: 25 })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feBlend", {
      id: this.id + "Fe",
      in: "SourceGraphic",
      mode: "hard-light",
    });
  }
  changeMode() {
    let mode = nextArrayElement(
      this.filterSpecificEnum,
      this.fe.getAttributeNS(null, "mode")
    );
    gsap.set(this.fe, { attr: { mode: mode } });
  }
}

class Offset extends FilterElement {
  constructor(id, index) {
    super(id, index);
    this.dragOffset(this.controllerId + "Offset");
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(title({}, "Offset: This one just moves things"));
    g.appendChild(
      rect({
        x: 2,
        y: 2,
        width: 46,
        height: 46,
        rx: 5,
        ry: 5,
        class: this.controllerId + "OffsetBounds " + this.triggerId,
        fill: "white",
      })
    );
    let offsetG = group({ class: this.controllerId + "Offset" });
    offsetG.appendChild(
      rect({
        x: 12,
        y: 12,
        width: 26,
        height: 26,
        fill: "gray",
      })
    );
    offsetG.appendChild(use({ href: "#out" }));
    g.appendChild(offsetG);
    let useOut = use({ href: "#out" });
    gsap.set(useOut, { svgOrigin: "25 25", rotate: 45, scale: 1.5 });

    g.appendChild(useOut);
    return g;
  }
  createFe() {
    return createSvgElement("feOffset", { id: this.id + "Fe" });
  }
  dragOffset(targetId) {
    let thisClass = this;
    Draggable.create("." + targetId, {
      type: "x,y",
      edgeResistance: 1,
      bounds: $("." + targetId + "Bounds")[0],
      onDrag: function () {
        gsap.set(thisClass.fe, {
          attr: { dx: "+=" + this.x, dy: "+=" + this.y },
        });
      },
      onDragEnd: function () {
        gsap.to("." + targetId, { duration: dur, x: 0, y: 0 });
      },
    });
  }
}

class ColorMatrix extends FilterElement {
  constructor(id, index) {
    super(id, index);
    this.filterSpecificEnum = [
      "matrix",
      "saturate",
      "hueRotate",
      "luminanceToAlpha",
    ];
    $(`.${this.controllerId}MatrixValue`).click((e) => {
      this.toggleValue(e, this);
    });
    $(`.${this.controllerId}TypeSwitch`).click(() => {
      this.changeType();
    });
  }
  initVars() {
    this.matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      title(
        {},
        "ColorMatrix: Press the circles to flip values, or press the switch to control saturation or hue with the dial in the top right"
      )
    );
    g.appendChild(
      path({
        d: $("#colorMatrixRear").attr("d"),
        class: `${this.triggerId} panelRear`,
      })
    );
    g.appendChild(
      path({
        class: this.triggerId + " matrixPanel",
        d: $("#colorMatrixMain").attr("d"),
      })
    );
    this.matrix.forEach((v, index) => {
      g.appendChild(
        circle({
          r: 3,
          cx: ((index % 5) + 1.1) * 8,
          cy: (index / 5 + 1.7) * 8,
          class: `${!!v} ${this.controllerId}MatrixValue`,
        })
      );
    });
    g.appendChild(
      path({
        class: this.controllerId + "TypeSwitch switch",
        d: $("#colorMatrixSwitch").attr("d"),
      })
    );
    let dial = use({
      class: this.controllerId + "ValueDial",
      href: "#genericDial",
    });
    gsap.set(dial, { svgOrigin: "25 25", x: 14, y: -16, scale: 0.8 });
    g.appendChild(dial);
    return g;
  }
  createFe() {
    return createSvgElement("feColorMatrix", {
      id: this.id + "Fe",
      type: "matrix",
      values: this.matrix,
    });
  }
  toggleValue(e, thisClass) {
    let target = $(e.target);
    let oldVal = target.hasClass("true");
    let i = $(`.${thisClass.controllerId}MatrixValue`).index(target);
    target.removeClass(oldVal.toString());
    target.addClass((!oldVal).toString());
    if ($(thisClass.fe).attr("type") == "matrix") {
      thisClass.matrix[i] = oldVal ? 0 : 1;
      thisClass.updateMatrixFe();
    }
  }
  updateMatrixValues() {
    $(`.${this.controllerId}MatrixValue`).each((index, el) => {
      this.matrix[index] = $(el).hasClass("true") ? 1 : 0;
    });
    this.updateMatrixFe();
  }
  updateMatrixFe() {
    $(this.fe).attr("values", this.matrix);
  }
  changeType() {
    let type = nextArrayElement(
      this.filterSpecificEnum,
      this.fe.getAttributeNS(null, "type")
    );
    switch (type) {
      case "matrix":
        super.attrKnob($(`.${this.controllerId}ValueDial`), null, {});
        this.updateMatrixValues();
        break;
      // TODO: maybe these shouldnt be hardcoded values, instead remeber the old value and use it again?
      case "saturate":
        gsap.set(this.fe, { attr: { values: 1 } });
        super.attrKnob($(`.${this.controllerId}ValueDial`), "values", {
          multiplyer: 1 / 360,
          minRotation: -5 * oneRotation,
          maxRotation: 5 * oneRotation,
        });
        break;
      case "hueRotate":
        gsap.set(this.fe, { attr: { values: 90 } });
        super.attrKnob($(`.${this.controllerId}ValueDial`), "values", {
          minRotation: "none",
          maxRotation: "none",
        });
        break;
      default:
        gsap.set(this.fe, { attr: { values: null } });
        super.attrKnob($(`.${this.controllerId}ValueDial`), null, {});
    }
    gsap.set(this.fe, { attr: { type: type } });
  }
}

class Flood extends FilterElement {
  constructor(id, index) {
    super(id, index);
    $(`.${this.controllerId}ColorPicker`).change((e) => {
      gsap.set(this.fe, { attr: { [FLOOD_COLOR]: e.target.value } });
    });
    super.attrKnob(`.${this.controllerId}Opacity`, FLOOD_OPACITY, {
      multiplyer: 1 / 360,
    });
  }
  initVars() {
    this.color = randomColor();
  }
  createController() {
    let g = group({
      id: this.controllerId,
      class: `${this.controllerId} flood`,
    });
    g.appendChild(
      title(
        {},
        "Flood: Floods the entire space with a single color, works best when plugged into Composite or Blend"
      )
    );
    g.appendChild(this.createColorPicker());
    g.appendChild(
      path({
        d: $("#floodMain").attr("d"),
        class: `${this.triggerId} floodMain`,
      })
    );
    let useDial = use({
      href: "#genericDial",
      class: this.controllerId + "Opacity",
    });
    gsap.set(useDial, { svgOrigin: "25 25", y: 8, scale: 1.5 });
    g.appendChild(useDial);
    return g;
  }
  createFe() {
    return createSvgElement("feFlood", {
      id: this.id + "Fe",
      [FLOOD_COLOR]: this.color,
      [FLOOD_OPACITY]: 0.5,
    });
  }
}

class ComponentTransfer extends FilterElement {
  constructor(id, index) {
    super(id, index);
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    let dialW = 5;
    g.appendChild(
      title(
        {},
        "ComponentTransfer: The switches on the left determine the mode for each color channel and the dials modify aspects depending on the mode"
      )
    );
    let clipPath = createSvgElement("clipPath", {
      id: `${this.controllerId}ClipPath`,
    });
    clipPath.appendChild(rect({ y: 5, width: 50, height: 40, rx: 5, ry: 5 }));
    g.appendChild(clipPath);

    this.compArr.forEach((c, row) => {
      let func = group({
        class: this.controllerId + "Func" + c.name,
      });
      func.appendChild(
        rect({
          height: "10px",
          width: "50px",
          class: "func func" + c.name + " " + this.triggerId,
          y: row * 10 + 5,
          [CLIP_PATH]: `url(#${this.controllerId}ClipPath)`,
        })
      );
      let typeSwitch = rect({
        x: 4,
        y: dialW * 2 * row + 7,
        width: dialW,
        height: dialW,
        fill: "orange",
      });
      $(typeSwitch).click(() => {
        this.changeType(row);
      });
      func.appendChild(typeSwitch);
      this.attrArr.forEach((a, col) => {
        let idString = this.controllerId + "Row" + row + "Col" + col;
        let attrKnob = use({
          href: "#genericDial",
          class: idString + " funcButton",
        });
        gsap.set(attrKnob, {
          svgOrigin: "25 25",
          scale: 0.6,
          x: dialW * 1.5 * col - 9,
          y: dialW * 2 * row - 15,
        });

        this.sharedKnob(attrKnob, row, this.attrArr[col], col);
        func.appendChild(attrKnob);
      });
      g.appendChild(func);
    });
    return g;
  }
  createFe() {
    let compTrans = createSvgElement("feComponentTransfer", {
      id: this.id + "Fe",
    });
    this.compArr.forEach((c) => {
      compTrans.appendChild(
        createSvgElement("feFunc" + c.name, {
          class: this.id + "FeFunc",
          type: "gamma",
          tableValues: "1 1 0 0",
          slope: 0.5,
          intercept: 0.25,
          amplitude: 4,
          exponent: 4,
          offset: 0,
        })
      );
    });
    return compTrans;
  }
  initVars() {
    this.filterSpecificEnum = [
      "identity",
      "table",
      "discrete",
      "linear",
      "gamma",
    ];
    this.compArr = [
      { name: "R", typeIndex: 0, tableValues: [1, 1, 0, 0] },
      { name: "G", typeIndex: 0, tableValues: [1, 1, 0, 0] },
      { name: "B", typeIndex: 0, tableValues: [1, 1, 0, 0] },
      { name: "A", typeIndex: 0, tableValues: [1, 1, 0, 0] },
    ];
    this.attrArr = ["slope", "intercept", "amplitude", "exponent", "offset"];
  }
  changeType(compIndex) {
    gsap.set(this.fe.childNodes[compIndex], {
      attr: { type: this.nextComponent(compIndex) },
    });
  }
  nextComponent(compIndex) {
    return gsap.utils.wrap(
      this.filterSpecificEnum,
      ++this.compArr[compIndex].typeIndex
    );
  }
  //this is a great example of high coupling, low cohesion; the exact opposite of ideal
  sharedKnob(targetEl, funcIndex, attribute, tableValueIndex) {
    let thisClass = this;
    Draggable.create(targetEl, {
      type: "rotation",
      bounds: { minRotation: 0, maxRotation: oneRotation },
      onDrag: function () {
        let thisTableValues = thisClass.compArr[funcIndex].tableValues;
        thisTableValues[tableValueIndex] = this.rotation / 360;
        gsap.set(thisClass.fe.childNodes[funcIndex], {
          //TODO: you need differnt multiplyers for different attributes. exponent/amplitude shoud go to 10, slope/intercept/offest 0-1?????
          attr: {
            [attribute]: this.rotation / 36,
            tableValues: thisTableValues,
          },
        });
      },
    });
  }
}
// TODO: figure out what the hell this is and how to make a controller for it
class ConvolveMatrix extends FilterElement {}

class Image extends FilterElement {
  constructor(id, index) {
    super(id, index);
    $(this.controller).click(() => {
      this.nextImage();
    });
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      title(
        {},
        "Image: This works best when plugged into any of the FilterElements with complicated sounding names (try plugging it into the displacement map). click for different images"
      )
    );
    g.appendChild(
      rect({
        class: `${this.triggerId} imageRear`,
        x: 5,
        y: 5,
        width: 40,
        height: 40,
        rx: 5,
        ry: 5,
      })
    );
    g.appendChild(
      circle({ r: 5, cx: 35, cy: 15, class: `${this.triggerId} imageMain` })
    );
    g.appendChild(
      polyline({
        class: `${this.triggerId} imageMain`,
        points: "10,40 20,20 30,35, 33,30 40,40",
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feImage", {
      id: this.id + "Fe",
      href: imageArr[0],
    });
  }
  initVars() {
    this.filterSpecificEnum = imageArr;
  }
  nextImage() {
    gsap.set(this.fe, {
      attr: {
        href: nextArrayElement(
          this.filterSpecificEnum,
          this.fe.getAttributeNS(null, "href")
        ),
      },
    });
  }
}

class Tile extends FilterElement {
  constructor(id, index) {
    super(id, index);
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      title(
        {},
        "This one seems like it would be the simplest but I didnt get it to work yet"
      )
    );
    g.appendChild(
      rect({
        class: this.triggerId,
        fill: "blue",
        x: 5,
        y: 5,
        width: 40,
        height: 40,
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feTile", {
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });
  }
}

class Merge extends FilterElement {
  constructor(id, index) {
    super(id, index);
    $(`.${this.controllerId}SourceSwitch`).click(() => {
      this.flipSource();
    });
    $(`.${this.controllerId}NewNode`).click(() => {
      this.newNode();
    });
    this.dragNode();
  }
  initVars() {
    this.nodes = [];
    this.nodeCounter = 0;
  }

  createController() {
    let g = group({ id: this.controllerId });
    g.appendChild(
      rect({
        x: 10,
        y: 10,
        width: 30,
        height: 30,
        rx: 5,
        ry: 5,
        fill: "white",
        class: this.triggerId,
      })
    );
    g.appendChild(
      rect({
        x: 15,
        y: 15,
        width: 5,
        height: 5,
        fill: "black",
        class: `${this.controllerId}SourceSwitch`,
      })
    );
    g.appendChild(
      circle({
        cx: 25,
        cy: 25,
        r: 5,
        fill: "black",
        class: `${this.controllerId}NewNode`,
      })
    );
    return g;
  }
  createFe() {
    let fe = createSvgElement("feMerge", { id: this.id + "Fe" });
    fe.appendChild(this.sourceNode());
    return fe;
  }
  flipSource() {
    let sourceNode = $(this.fe).find(".mergeNodeSource")[0];
    sourceNode
      ? $(sourceNode).remove()
      : this.fe.appendChild(this.sourceNode());
  }
  sourceNode() {
    return createSvgElement("feMergeNode", {
      in: "SourceGraphic",
      class: "mergeNodeSource",
    });
  }
  newNode() {
    return MergeNode(this.id + "Node" + this.nodeCounter, 8);
  }
  getPreviousControllers() {
    let controllers = [];
    let currentElement = this;
    while (currentElement.prev) {
      currentElement = currentElement.prev;
      if (controllers.indexOf(currentElement) == -1) {
        controllers.push(currentElement.controller);
      } else {
        currentElement = null;
      }
    }
    return controllers;
  }
}
//end of filter classes

//sub filters - light source elements (lse) and merge nodes
class LightSourceElement extends Controller {
  constructor(id, index) {
    super(id, index);
    this.fe = this.createFe();
    this.drag();
  }
  toDOM() {
    lseLayer.appendChild(this.controller);
  }
  dragLse(targetId, triggerId) {
    let thisClass = this;
    let validHit = false;
    Draggable.create(targetId, {
      type: "x,y",
      edgeResistance: 0.9,
      trigger: triggerId,
      bounds: grid,
      inertia: true,
      onDragEnd: function (e) {
        let lightingElements = $(".lightingElement");
        let i = lightingElements.length;
        while (--i > -1) {
          let le = lightingElements[i];
          if (this.hitTest(le, OVERLAP_THRESHOLD)) {
            thisClass.dropIntoLightSocket(this.target, le);
            validHit = true;
          }
        }
        if (!validHit) thisClass.resetLse();
      },
    });
  }
  drag() {
    this.dragLse("." + this.controllerId, "." + this.triggerId);
  }
  //this empty function exists for the benefit of elements that have attributes affected by dragged controller switches and stuff, this one is for all the others that have none
  attrDrag() {
    return true;
  }
  dropIntoLightSocket(lse, lightElement) {
    let lseClass = $(lse).data("class");
    let lightElementClass = $(lightElement).data("class");
    if (lightElementClass.lse) {
      lightElementClass.lse.resetLse();
    }
    $(lse).addClass(lightElementClass.controllerId);
    lightElementClass.drag();
    lseClass.attrDrag();
    lightElementClass.lse = lseClass;
    //this probably wont work
    $(lightElementClass.fe).html();
    lightElementClass.fe.appendChild(lseClass.fe);
    gsap.to(`.${lseClass.controllerId} .bulb`, {
      duration: dur,
      fill: lightElementClass.color,
    });
    updateAllFilters();
  }
  resetLse() {
    this.fe.remove();
    //TODO: this class string should come from a class value, same with the createController class strings
    this.controller.classList = this.controllerId;
    this.drag();
    setTimeout(() => {
      gsap.to(this.controller, {
        duration: dur * 2,
        x: controllerArr[this.controllerArrayIndex].initX * gridWidth,
        y: controllerArr[this.controllerArrayIndex].initY * gridHeight,
      });
    }, timeout);
  }
}

class PointLight extends LightSourceElement {
  constructor(id, index) {
    super(id, index);
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      title(
        {},
        "Spotlight: Drag onto 'SpecularLighting' or 'DiffuseLighting' for a nearby light source"
      )
    );
    g.appendChild(
      path({
        d: $("#bulbThreads").attr("d"),
        class: "bulbThreads",
      })
    );
    g.appendChild(path({ d: $("#bulbNeck").attr("d"), class: "bulbNeck" }));
    g.appendChild(
      path({ d: $("#pointBulb").attr("d"), class: this.triggerId + " bulb" })
    );
    return g;
  }
  createFe() {
    // TODO: Move default values
    return createSvgElement("fePointLight", {
      id: this.id + "Fe",
      x: 50,
      y: 50,
      z: 220,
    });
  }
}

class DistantLight extends LightSourceElement {
  constructor(id, index) {
    super(id, index);
    gsap.set(".distantElevation", { svgOrigin: "5 5" });
    gsap.set(".distantAzimuth", { svgOrigin: "12 22" });
    this.attrDrag();
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      title(
        {},
        "Spotlight: Drag onto 'SpecularLighting' or 'DiffuseLighting' for a far off light source. The crescent shapes can be dragged to change elevation and azimuth, whatever that is"
      )
    );
    g.appendChild(
      path({
        d: $("#bulbThreads").attr("d"),
        class: "bulbThreads",
      })
    );
    g.appendChild(path({ d: $("#bulbNeck").attr("d"), class: "bulbNeck" }));
    g.appendChild(
      path({
        d: $("#distantBulbAzimuth").attr("d"),
        class: this.controllerId + "Azimuth distantAzimuth",
      })
    );
    g.appendChild(
      path({ d: $("#distantBulb").attr("d"), class: this.triggerId + " bulb" })
    );
    g.appendChild(
      path({
        d: $("#distantBulbElevation").attr("d"),
        class: this.controllerId + "Elevation distantElevation",
      })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feDistantLight", { id: this.id + "Fe" });
  }
  attrDrag() {
    super.attrKnob("." + this.controllerId + "Azimuth", "azimuth", {
      minRotation: "none",
      maxRotation: "none",
    });
    super.attrKnob("." + this.controllerId + "Elevation", "elevation", {
      minRotation: "none",
      maxRotation: "none",
    });
  }
}

class SpotLight extends LightSourceElement {
  constructor(id, index) {
    super(id, index);
  }
  createController() {
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      title(
        {},
        "Spotlight: Drag onto 'SpecularLighting' or 'DiffuseLighting' for focused lighting"
      )
    );
    g.appendChild(
      path({ d: $("#bulbThreads").attr("d"), class: "bulbThreads" })
    );
    g.appendChild(path({ d: $("#bulbNeck").attr("d"), class: "bulbNeck" }));
    g.appendChild(
      path({ d: $("#spotBulbRear").attr("d"), class: "spotBulbRear" })
    );
    g.appendChild(
      path({ d: $("#spotBulbAngle").attr("d"), class: "spotBulbAngle bulb" })
    );
    g.appendChild(
      path({
        d: $("#spotBulbMain").attr("d"),
        class: this.triggerId + " spotBulbMain",
      })
    );
    g.appendChild(
      path({ d: $("#spotBulbReflector").attr("d"), class: "spotBulbReflector" })
    );
    return g;
  }
  createFe() {
    return createSvgElement("feSpotLight", {
      id: this.id + "Fe",
      x: -10,
      y: 10,
      z: 50,
      pointsAtX: 100,
      pointsAtY: 100,
      specularExponent: 5,
      limitingConeAngle: 30,
    });
  }
}
class MergeNode extends Controller {
  constructor(id, index) {
    super(id, index);
    this.fe = creatFe();
    this.dragNode();
  }
  createController() {
    return circle({
      cx: 25,
      cy: 25,
      r: 5,
      fill: "turquoise",
    });
  }
  resetNode(e) {
    gsap.to(e.target, { duration: dur, x: 0, y: 0 });
  }
  dropNode(mergeNode, targetEl) {
    let targetClass = $(targetEl).data("class");
    $(mergeNode).addClass(targetClass.controllerId);
    targetClass.drag();
    this.fe.appendChild(
      createSvgElement("feMergeNode", { in: targetClass.id })
    );
  }
  dragNode() {
    let thisClass = this;
    let validHit = false;
    Draggable.create(`.${this.controllerId}Node`, {
      type: "x,y",
      bounds: grid,
      snap: {
        x: function (endValue) {
          return Math.round(endValue / gridWidth) * gridWidth;
        },
        y: function (endValue) {
          return Math.round(endValue / gridHeight) * gridHeight;
        },
      },
      onDragEnd: function (e) {
        let previousControllers = thisClass.getPreviousControllers();
        let i = previousControllers.length;
        while (--i > -1) {
          if (this.hitTest(previousControllers[i])) {
            thisClass.dropNode(this.target, previousControllers[i]);
            validHit = true;
          }
        }
        if (!validHit) thisClass.resetNode(this);
      },
    });
  }
}
//end of sub filters - light source elements and mergeNodes

//TODO: determine best patern of inheritance for connector, connector2 and merge
//FIXME: as a result of you not bothering to do the above you now have a shit tonne of repeated code
class Connector extends Controller {
  constructor(id, index) {
    super(id, index);
    this.dragConnector();
    this.input = null;
    this.output = null;
    $(`#${this.controllerId}Line`).click(() => {
      this.resetConnector();
    });
  }
  toDOM() {
    connectorLayer.appendChild(this.controller);
  }
  createController() {
    // move to init vars?
    this.maleClasses = this.controllerId + "Head male connector";
    this.femaleClasses = this.controllerId + "Head female connector";
    let g = group();
    g.appendChild(
      title(
        {},
        "Connector: Connect the pink end to a FilterElement and the blue end to a socket, or another FilterElement"
      )
    );
    g.appendChild(
      path({
        id: this.controllerId + "Male",
        class: this.maleClasses,
        fill: "lightblue",
        d: $("#connectorMale").attr("d"),
      })
    );
    wireLayer.appendChild(
      polyline({
        id: this.controllerId + "Line",
        points: "25,25 25,25 25,25 25,25",
        strokeWidth: 5,
        stroke: "black",
        class: "wire",
      })
    );
    g.appendChild(
      path({
        id: this.controllerId + "Female",
        class: this.femaleClasses,
        fill: "magenta",
        d: $("#connectorFemale").attr("d"),
      })
    );
    return g;
  }
  dragConnector() {
    let thisClass = this;
    Draggable.create("." + thisClass.controllerId + "Head", {
      type: "x,y",
      edgeResistance: 0.9,
      bounds: grid,
      inertia: true,
      snap: {
        x: function (endValue) {
          return Math.round(endValue / gridWidth) * gridWidth;
        },
        y: function (endValue) {
          return Math.round(endValue / gridHeight) * gridHeight;
        },
      },
      onDragEnd: function (e) {
        let feControllersAndSockets = $(".filterElementController").add(
          $(".filterSocket")
        );
        let i = feControllersAndSockets.length;
        while (--i > -1) {
          if (this.hitTest(feControllersAndSockets[i])) {
            thisClass.connectFilterElement(
              this.target,
              feControllersAndSockets[i]
            );
          }
        }
      },
    });
  }

  connectFilterElement(connector, filterElement) {
    let feClass = $(filterElement).data("class");
    let female = $(connector).hasClass("female");
    if (
      (female && (feClass.next || $(filterElement).hasClass("filterSocket"))) ||
      (!female && (feClass.prev || !this.input || this.input == feClass))
    ) {
      this.resetConnector();
    } else {
      if (female) this.input = feClass;
      else {
        feClass.prev = this.input;
        this.input.next = feClass;
        // if ($(filterElement).hasClass("in2")) {
        //   gsap.set(feClass.fe, { attr: { in2: this.input.id } });
        // }
        this.output = feClass;
      }
      $(connector).addClass(feClass.controllerId);
      try {
        feClass.wires.push(this);
      } catch {}
      feClass.drag();
      // FIXME: this should maybe just update the relevant filter?
      updateAllFilters();
      this.reDrawPolyline();
    }
  }

  resetConnector() {
    let gChildren = this.controller.childNodes;
    let thisClass = this;
    try {
      this.input.next = null;
    } catch {}
    try {
      this.output.prev = null;
    } catch {}
    try {
      this.output.wires.splice(this.output.wires.indexOf(this), 1);
    } catch {}
    try {
      this.input.wires.splice(this.input.wires.indexOf(this), 1);
    } catch {}
    $("#" + this.controllerId + "Female").attr("class", this.femaleClasses);
    $("#" + this.controllerId + "Male").attr("class", this.maleClasses);
    this.dragConnector();
    this.input = null;
    this.output = null;
    //FIXME: this is probably not the right place for this function
    updateAllFilters();
    setTimeout(() => {
      let tlReset = gsap.timeline({
        onComplete: () => {
          thisClass.reDrawPolyline();
        },
      });
      tlReset.to(gChildren, { duration: dur, x: 0, y: 0 });
    }, timeout);
  }

  reDrawPolyline() {
    let female = document.getElementById(`${this.controllerId}Female`);
    let male = document.getElementById(`${this.controllerId}Male`);
    // FIXME: some repeated math here and repeated code
    let cxf = Math.trunc(
      gridWidth / 2 + gsap.getProperty(female, "x") + this.initX * gridWidth
    );
    let cyf = Math.trunc(
      gridHeight / 2 + gsap.getProperty(female, "y") + this.initY * gridHeight
    );
    let cxm = Math.trunc(
      gridWidth / 2 + gsap.getProperty(male, "x") + this.initX * gridWidth
    );
    let cym = Math.trunc(
      gridHeight / 2 + gsap.getProperty(male, "y") + this.initY * gridHeight
    );
    let x2 = (cxm + cxf) / 2;
    let points = `${cxf},${cyf} ${x2},${cyf} ${x2},${cym} ${cxm},${cym}`;
    gsap.to(`#${this.controllerId}Line`, { attr: { points: points } });
  }
}

class ConnectorTwo extends Connector {
  constructor(id, index) {
    super(id, index);
  }
  createController() {
    this.maleClasses = this.controllerId + "Head male connector";
    this.femaleClasses = this.controllerId + "Head female connector";
    let g = group({ id: this.controllerId, class: this.controllerId });
    g.appendChild(
      path({
        d:
          "M10,40 L10,10 L40,10 M22,12 L12,22 M16,26 L26,16 M15,19 L19,23 M19,15 L23,19",
        fill: "pink",
        id: `${this.controllerId}Female`,
        class: this.femaleClasses,
      })
    );
    wireLayer.appendChild(
      polyline({
        id: this.controllerId + "Line",
        points: "25,25 25,25 25,25 25,25",
        strokeWidth: 5,
        stroke: "black",
        class: "wire connectorTwo",
      })
    );
    g.appendChild(
      path({
        d:
          "M10,40 L40,10 L40,40 M28,38 L38,28 M34,24 L24,34 M35,31 L31,27 M31,35 L27,31",
        fill: "teal",
        id: `${this.controllerId}Male`,
        class: this.maleClasses,
      })
    );
    return g;
  }
  connectFilterElement(connector, filterElement) {
    let feClass = $(filterElement).data("class");
    let female = $(connector).hasClass("female");

    if (female) this.input = feClass;
    else {
      if (
        this.isNext(this.input, feClass) &&
        $(filterElement).hasClass("in2")
      ) {
        this.output = feClass;
        gsap.set(this.output.fe, {
          attr: { in: feClass.prev.id, in2: this.input.id },
        });
      } else this.resetConnector();
    }
    $(connector).addClass(feClass.controllerId);
    feClass.drag();
    try {
      feClass.wires.push(this);
    } catch {}
    this.reDrawPolyline();
  }

  resetConnector() {
    let gChildren = this.controller.childNodes;
    let thisClass = this;
    try {
      gsap.set(this.output.fe, {
        attr: {
          in2: this.output.prev ? `#${this.output.prev.id}Fe` : "SourceGraphic",
        },
      });
    } catch {}
    try {
      this.output.wires.splice(this.output.wires.indexOf(this), 1);
    } catch {}
    try {
      this.input.wires.splice(this.input.wires.indexOf(this), 1);
    } catch {}
    $("#" + this.controllerId + "Female").attr("class", this.femaleClasses);
    $("#" + this.controllerId + "Male").attr("class", this.maleClasses);
    this.dragConnector();
    this.input = null;
    this.output = null;
    //FIXME: this is probably not the right place for this function
    updateAllFilters();
    setTimeout(() => {
      let tlReset = gsap.timeline({
        onComplete: () => {
          thisClass.reDrawPolyline();
        },
      });
      tlReset.to(gChildren, { duration: dur, x: 0, y: 0 });
    }, timeout);
  }
  // TODO: this function is similar to others. cycle though prev/next till element is found (returns false if hits null or hits the same element twice)
  isNext(input, isNext) {
    let dupArr = [input];
    while (input && input.next) {
      if (input.next == isNext) return true;
      input = input.next;
      if (dupArr.indexOf(input) == -1) dupArr.push(input);
      else {
        return false;
      }
    }
    return false;
  }
}

class FilterSocket extends Controller {
  constructor(id, index) {
    super(id, index);
    $(this.controller).addClass("territorial");
    this.counter = this.id.slice(12);
    this.filter = this.createFilter();
    this.prev = null;
    filterDefs.appendChild(this.filter);
  }
  createController() {
    let g = group({
      id: this.controllerId,
      class: this.controllerId + " filterSocket",
    });
    g.appendChild(
      title(
        {},
        "Socket: plug the blue end of a connector here in order to make a filter"
      )
    );
    g.appendChild(rect({ class: "socket", width: 50, height: 50 }));
    return g;
  }
  createFilter() {
    let filter = createSvgElement("filter", {
      id: `filter${this.counter}`,
      x: "-300%",
      width: "700%",
    });
    filter.append(createSvgElement("feOffset"));
    return filter;
  }
  toDOM() {
    socketLayer.appendChild(this.controller);
  }
  updateFilter() {
    this.filter.innerHTML = "<feOffset/>";
    let currentFilterElement = this;
    let fes = [];
    while (currentFilterElement.prev) {
      currentFilterElement = currentFilterElement.prev;
      if (fes.indexOf(currentFilterElement.fe) != -1) {
        currentFilterElement.prev = null;
      } else {
        let fe = currentFilterElement.fe;
        fes.push(fe);
        fe.remove();
        $(this.filter).prepend(fe);
      }
    }
  }
  drag() {
    return false;
  }
}
//end of controllers

const controllerArr = [
  {
    name: "Connector",
    constructor: Connector,
    counter: 0,
    initX: 0,
    initY: 0,
  },
  {
    name: "ConnectorTwo",
    constructor: ConnectorTwo,
    counter: 0,
    initX: 2,
    initY: 0,
  },
  {
    name: "Morphology",
    constructor: Morphology,
    counter: 0,
    initX: 1,
    initY: 1,
  },
  {
    name: "GaussianBlur",
    constructor: GaussianBlur,
    counter: 0,
    initX: 0,
    initY: 1,
  },
  {
    name: "DisplacementMap",
    constructor: DisplacementMap,
    counter: 0,
    initX: 2,
    initY: 3,
  },
  {
    name: "Turbulence",
    constructor: Turbulence,
    counter: 0,
    initX: 0,
    initY: 3,
  },
  {
    name: "SpecularLighting",
    constructor: SpecularLighting,
    counter: 0,
    initX: 0,
    initY: 4,
  },
  {
    name: "DiffuseLighting",
    constructor: DiffuseLighting,
    counter: 0,
    initX: 1,
    initY: 4,
  },
  { name: "Merge", constructor: Merge, counter: 0, initX: 2, initY: 4 },
  { name: "Composite", constructor: Composite, counter: 0, initX: 0, initY: 2 },
  { name: "Blend", constructor: Blend, counter: 0, initX: 1, initY: 2 },
  { name: "Offset", constructor: Offset, counter: 0, initX: 2, initY: 1 },
  {
    name: "ColorMatrix",
    constructor: ColorMatrix,
    counter: 0,
    initX: 0,
    initY: 6,
  },
  { name: "Flood", constructor: Flood, counter: 0, initX: 2, initY: 2 },
  {
    name: "ComponentTransfer",
    constructor: ComponentTransfer,
    counter: 0,
    initX: 1,
    initY: 6,
  },
  { name: "Image", constructor: Image, counter: 0, initX: 1, initY: 3 },
  {
    name: "PointLight",
    constructor: PointLight,
    counter: 0,
    initX: 0,
    initY: 5,
  },
  {
    name: "DistantLight",
    constructor: DistantLight,
    counter: 0,
    initX: 1,
    initY: 5,
  },
  { name: "SpotLight", constructor: SpotLight, counter: 0, initX: 2, initY: 5 },
  {
    name: "FilterSocket",
    constructor: FilterSocket,
    counter: 0,
    initX: 12,
    initY: 3,
  },
];

initializeGrid = function () {
  for (i = 0; i < gridRows * gridColumns; i++) {
    y = Math.floor(i / gridColumns) * gridHeight;
    x = (i * gridWidth) % (gridColumns * gridWidth);
    row = Math.floor(i / gridColumns);
    col = i % gridColumns;
    $("#gridLayer")[0].appendChild(
      rect({
        x: x,
        y: y,
        fill: "gray",
        opacity: 0.3,
        width: gridWidth - 1,
        height: gridHeight - 1,
        class: `row${row} col${col} empty`,
      })
    );
  }
};

importExternalSvg = function () {
  const externalSVGs = [
    {
      container: "#controllerMorphologyContainer",
      path: "/assets/controllers/controllerMorphology.svg",
    },
    {
      container: "#controllerDisplacementMapContainer",
      path: "/assets/controllers/controllerDisplacementMap.svg",
    },
    {
      container: "#controllerTurbulenceContainer",
      path: "/assets/controllers/controllerTurbulence.svg",
    },
    {
      container: "#controllerSpecularLightingContainer",
      path: "/assets/controllers/controllerSpecularLighting.svg",
    },
    {
      container: "#controllerDiffuseLightingContainer",
      path: "/assets/controllers/controllerDiffuseLighting.svg",
    },
    {
      container: "#controllerColorMatrixContainer",
      path: "/assets/controllers/controllerColorMatrix.svg",
    },
    {
      container: "#controllerFloodContainer",
      path: "/assets/controllers/controllerFlood.svg",
    },
    {
      container: "#connectorContainer",
      path: "/assets/controllers/connector.svg",
    },
    {
      container: "#compositeOperatorContainer",
      path: "/assets/controllers/compositeOperatorPaths.svg",
    },
    { container: "#bulbsContainer", path: "/assets/controllers/bulbs.svg" },
    { container: "#canvasLayer", path: "/assets/skull.svg" },
  ];
  Promise.all(
    externalSVGs.map((extSVG) => {
      fetch(extSVG.path)
        .then(function (response) {
          return response.text();
        })
        .then(function (body) {
          document.querySelector(extSVG.container).innerHTML = body;
        });
    })
  )
    //TODO: figure out why this doesnt wait until promise is finished
    .then(function () {
      tutorialPrompt();
    });
};

updateAllFilters = function () {
  Array.from(document.getElementsByClassName("filterSocket")).forEach((s) => {
    $(s).data("class").updateFilter();
  });
};

generateController = function (controllerKey) {
  let c = controllerArr[controllerKey];
  return new c.constructor(c.name + c.counter++, controllerKey);
};

generateAllControllers = function () {
  controllerArr.forEach(
    (c, index) => new c.constructor(c.name + c.counter++, index)
  );
};

generateNewControllerButton = function (index) {
  let c = controllerArr[index];
  let newButton = group({
    class: "newControllerButton",
    id: `new${c.name}Button`,
  });
  newButton.appendChild(
    circle({
      r: 12,
      cx: 25,
      cy: 25,
      fill: "white",
    })
  );
  newButton.appendChild(
    polyline({
      points:
        "23,23 23,15 27,15 27,23 35,23 35,27 27,27 27,35 23,35 23,27 15,27 15,23",
    })
  );
  $(newButton).click(() => {
    generateController(index);
  });
  buttonLayer.appendChild(newButton);
  gsap.set(newButton, {
    x: c.initX * gridWidth,
    y: c.initY * gridHeight,
    opacity: 0,
  });
  gsap.to(newButton, { duration: dur, opacity: 1 });
  return newButton;
};

generateAllNewControllerButtons = function () {
  controllerArr.forEach((c, index) => generateNewControllerButton(index));
};

//TUTORIAL STUFF
//FIXME: This is a really dumb way of making a tutorial
// should maybe be {{stuff to do},{end conditions}},{{stuff to do}, {end conditions}} something like that?
const Tutorial = {
  filterSocket: null,
  //FIXME: hardcoded value, should be aquired from filterSocket instead
  filterString: "#filter0",
  runTutorial: () => {
    nextTutorialButton.onclick = Tutorial.tutLightElements;
    Tutorial.filterSocket = generateController(19);
    gsap.set(".tutorialButtons", { visibility: "visible" });
    Tutorial.resetTutorial();
    Tutorial.showDialog(
      "This is an interactive demonstration of SVG filters. Take notice of the large skull in the center of the window and of the small square socket to the right of it. The filter will affect the skull, the socket will be use to input filter elements.",
      () => {
        let newBlurButton = generateNewControllerButton(3);
        let blurCreatedEvent = newBlurButton.addEventListener(
          "click",
          Tutorial.tutBlurCreated
        );
        setTimeout(() => {
          newBlurButton.removeEventListener("click", blurCreatedEvent);
          Tutorial.showDialog(
            "This new button on the left will create a 'Filter Element Controller'. Try giving it a click."
          );
        }, timeout);
      }
    );
  },
  tutBlurCreated: () => {
    Tutorial.showDialog(
      "This is a 'Filter Element Controller&trade;'. This particular one can apply a 'GaussianBlur' to the filter, but how do we get it to do that? with a connector.",
      () => {
        generateController(0);
        Tutorial.tutConnectorCreated();
      }
    );
  },
  tutConnectorCreated: () => {
    Tutorial.showDialog(
      "Now you just need to click and drag the female (pink) end of the connector over top of the 'Filter Element Controller' (the thing that looks like an eyeball). After that, drag the male (blue and pointy) end of the 'Connector' over top of our 'Filter Socket'."
    );
    let filterCheckInterval = setInterval(() => {
      if (Tutorial.filterSocket.prev) {
        clearInterval(filterCheckInterval);
        filterCheckInterval = setInterval(() => {
          if (
            document
              .querySelector(`${Tutorial.filterString} feGaussianBlur`)
              .getAttribute("stdDeviation") > 100
          ) {
            clearInterval(filterCheckInterval);
            Tutorial.showDialog(
              "Let's introduce a new 'Filter Element Controller'",
              () => {
                generateNewControllerButton(2);
                generateController(2);
                Tutorial.tutMorphologyCreated();
              }
            );
          }
        }, interval);
        Tutorial.showDialog(
          "Congratulations, you added a filter element to the filter. You may have noticed that the skull is now a little blurry. This is because of the filter element you just applied to it. Let's make it even blurier by dragging the pupil clockwise",
          interval
        );
      }
    }, interval);
  },
  tutMorphologyCreated: () => {
    Tutorial.showDialog(
      "This new controller can 'dilate' or 'erode' parts of an image, however, we cannot use it without a connector. Right now we only have one conncector and it is currently in use. To remove the connection, simply give the line drawn between the elements a click"
    );
    let filterCheckInterval = setInterval(() => {
      if (!Tutorial.filterSocket.prev) {
        clearInterval(filterCheckInterval);
        Tutorial.showDialog(
          "Now let's connect the female end to the 'Morphology Controller' and the male end to the 'Filter Socket'.",
          () => {
            filterCheckInterval = setInterval(() => {
              if (
                document.querySelector(`${Tutorial.filterString} feMorphology`)
              ) {
                clearInterval(filterCheckInterval);
                Tutorial.showDialog(
                  "Now that the 'Morphology Controller' is all hooked up you can increase or decrease its effect by dragging the little gray arrow, or switch between 'dialte' and 'erode' by simply clicking anywhere on the 'Morphology Controller'.",
                  () => {
                    setTimeout(() => {
                      Tutorial.showDialog(
                        "Now that you have a little experience with both filter elements, its time to combine them. In order to acheive this you will need a second connector. Click the newly created button to create a new connector",
                        () => {
                          let newConnectorButton = generateNewControllerButton(
                            0
                          );
                          let newConnectorEvent = newConnectorButton.addEventListener(
                            "click",
                            () => {
                              newConnectorButton.removeEventListener(
                                "click",
                                newConnectorEvent
                              );
                              Tutorial.tutSecondConnectorCreated();
                            }
                          );
                        }
                      );
                    }, longTimeout);
                  }
                );
              }
            }, interval);
          }
        );
      }
    }, interval);
  },
  tutSecondConnectorCreated: () => {
    Tutorial.showDialog(
      "Without removing our existing connection, drag the female end of the new connector to our 'Gaussian Blur Controller'(eyeball) and the male end to our 'Morphology Controller'(x-shaped blob)."
    );
    let filterCheckInterval = setInterval(() => {
      if (Tutorial.filterSocket.filter.childNodes.length > 2) {
        clearInterval(filterCheckInterval);
        Tutorial.showDialog(
          "Great work. Play around with the controllers. When you are ready to carry on, press the 'Next Tutorial' button."
        );
      }
    }, interval);
  },
  //Second phase of tutorial
  tutLightElements: () => {
    Tutorial.resetTutorial();
    nextTutorialButton.onclick = Tutorial.tutStep3;
    generateController(6);
    generateController(7);
    generateController(0);
    Tutorial.showDialog(
      "TUTORIAL 2: LIGHTS. These controllers are for 'Lighting Elements'. The one on the left controls 'Specular Lighting'; The one on the right controls 'Diffuse Lighting'. They cannot do much on thier own. Try connecting one to the filter socket",
      () => {
        let filterCheckInterval = setInterval(() => {
          if (Tutorial.filterSocket.prev) {
            clearInterval(filterCheckInterval);
            Tutorial.showDialog(
              "Oh No, Where did it go? 'Lighting Elements' need a light source to work",
              () => {
                generateController(16);
                generateController(17);
                generateController(18);
                Tutorial.showDialog(
                  "These are 'Light Source Elements' (hereforeto referedtoas:'LSE'). From left to right they are: 'Point Light', 'Distant Light', and 'Spot Light'. Drag one onto the 'Filter Element Controller' that you connected to the 'Filter Socket' previously.",
                  () => {
                    let filterCheckInterval = setInterval(() => {
                      if (Tutorial.filterSocket.prev.lse) {
                        clearInterval(filterCheckInterval);
                        Tutorial.showDialog(
                          "You can use the sliders on the 'Light Element Controller' to change it's attributes, you can also use the 'Light Element Controller' to change the color of the light source. If you would like to change the type of 'LSE' simply drag a different one over the 'Light Element Controller'. Take a few seconds to fuck around with the controls",
                          () => {
                            setTimeout(() => {
                              Tutorial.showDialog(
                                "This is showing the effect of the light on the image (refered to as the 'SourceGraphic' from here on out), but it no longer shows us the 'SourceGraphic' itself. One way to combine the 'SourceGraphic' with the 'Light Element' is to connect it to a 'Blend Controller'.",
                                () => {
                                  generateController(10);
                                  Tutorial.tutBlendCreated();
                                }
                              );
                            }, longTimeout * 2);
                          }
                        );
                      }
                    }, interval);
                  }
                );
              }
            );
          }
        }, interval);
      }
    );
  },
  tutBlendCreated: () => {
    Tutorial.showDialog(
      "This newest 'Filter Element Controller' is called the 'Blend Controller'. It works by combining two images, the method used to combine the two images can be changed by clicking the 'Blend Controller'.",
      () => {
        Tutorial.showDialog(
          "In order to use it properly, the 'Blend Controller' Will need to come after(refered to as 'downstream') whatever you are blending. You will have to unplug the existing connection",
          () => {
            let filterCheckInterval = setInterval(() => {
              if (!Tutorial.filterSocket.prev) {
                clearInterval(filterCheckInterval);
                generateNewControllerButton(0);
                Tutorial.showDialog(
                  "Connect the 'Lighting Element Controller' to the 'Blend Controller' and connect the 'Blend Controller' to the 'Filter Socket'.",
                  () => {
                    filterCheckInterval = setInterval(() => {
                      // TODO: if filterElement order is inccorect tell the user to swap the connection order
                      let filterChildren =
                        Tutorial.filterSocket.filter.childNodes;
                      if (
                        filterChildren.length === 3 &&
                        filterChildren[1].tagName == "feBlend"
                      ) {
                        clearInterval(filterCheckInterval);
                        Tutorial.showDialog(
                          "Click the 'Blend Controller' to change the blend mode",
                          () => {
                            //FIXME: having this as an arrayElement check is probably gonna cause exceptions
                            let currentMode = filterChildren[1].getAttribute(
                              "mode"
                            );
                            filterCheckInterval = setInterval(() => {
                              if (
                                filterChildren[1].getAttribute("mode") !==
                                currentMode
                              ) {
                                clearInterval(filterCheckInterval);
                                setTimeout(() => {
                                  generateController(11),
                                    Tutorial.tutCompositeCreated();
                                }, longTimeout);
                              }
                            });
                          },
                          interval
                        );
                      }
                    }, interval);
                  }
                );
              }
            }, interval);
          }
        );
      }
    );
  },
  tutCompositeCreated: () => {
    Tutorial.showDialog(
      "This new controller is the 'Composite Controller', it is functionally very similar to the 'Blend Controller'. Feel free to play with the lighting and when you are finished press the 'Next Tutorial' button"
    );
  },
  //ThirdPhase of tutorial
  tutStep3: () => {
    Tutorial.resetTutorial();
    nextTutorialButton.onclick = Tutorial.tutMerge;
    generateController(5);
    Tutorial.showDialog(
      "TUTORIAL 3: This is the 'Turbulence Controller'. Hook it up, bro.",
      () => {
        generateNewControllerButton(0);
        let filterCheckInterval = setInterval(() => {
          if (Tutorial.filterSocket.prev) {
            clearInterval(filterCheckInterval);
            Tutorial.showDialog(
              "This one just generates visual noise, and if used on its own it will completly eliminate our 'SourceGraphic' and/or anything else that was placed before it ('upstream') in the filter",
              () => {
                generateController(4);
                Tutorial.showDialog(
                  "When combined withe the newly created 'Displacement Map Controller' you can mutate the shape of the 'SourceGraphic' based on the output of the 'Turbulence Controller'. Make sure the turbulence filter is 'upstream' of the 'Displacement Map Controller'.",
                  () => {
                    // TODO: this needs inform the user if the filters are in the wrong order
                    filterCheckInterval = setInterval(() => {
                      let filterChildren =
                        Tutorial.filterSocket.filter.childNodes;
                      if (
                        filterChildren.length === 3 &&
                        filterChildren[1].tagName === "feDisplacementMap"
                      ) {
                        clearInterval(filterCheckInterval);
                        generateController(15);
                        Tutorial.showDialog(
                          "This 'Image Controller' adds and image to the filter and it can be used in much the same way as the 'Turbulence Controller'. Remove the existing connections and plug the 'Image Controller' directly into the 'Filter Socket'.",
                          () => {
                            filterCheckInterval = setInterval(() => {
                              if (Tutorial.filterSocket.prev instanceof Image) {
                                clearInterval(filterCheckInterval);
                                Tutorial.showDialog(
                                  "Try to remember what the image looks like so you can see how it is affected by the 'Displacement Map'. Disconnect the 'Image Controller' and connect it to the 'Displacement Map', then connect to the 'Filter Socket'.",
                                  () => {
                                    filterCheckInterval = setInterval(() => {
                                      filterChildren =
                                        Tutorial.filterSocket.filter.childNodes;
                                      console.log(filterChildren[1].tagName);
                                      if (
                                        filterChildren.length === 3 &&
                                        filterChildren[1].tagName ===
                                          "feDisplacementMap"
                                      ) {
                                        clearInterval(filterCheckInterval);
                                        generateController(6);
                                        generateController(7);
                                        generateController(16);
                                        generateController(17);
                                        generateController(18);
                                        Tutorial.tutLightBroughtBack();
                                      }
                                    }, interval);
                                  }
                                );
                              }
                            }, interval);
                          }
                        );
                      }
                    }, interval);
                  }
                );
              }
            );
          }
        }, interval);
      }
    );
  },
  tutLightBroughtBack: () => {
    Tutorial.showDialog(
      "Okay, now to bring back one of the 'Lighting Elements'. Disconnect the 'Displacement Map Controller' from the 'Filter Socket' and connect the 'Lighting Element' in between (make sure it has an 'LSE').",
      () => {
        filterCheckInterval = setInterval(() => {
          filterChildren = Tutorial.filterSocket.filter.childNodes;
          let len = filterChildren.length;
          if (
            filterChildren[len - 2].tagName === "feSpecularLighting" &&
            Tutorial.filterSocket.prev.lse &&
            filterChildren[len - 3].tagName === "feDisplacementMap" &&
            (filterChildren[len - 4].tagName === "feTrubulence" ||
              filterChildren[len - 4].tagName === "feImage")
          ) {
            clearInterval(filterCheckInterval);
            Tutorial.showDialog(
              "Great, now you can mess around with the dials and buttons for a moment, the next part will begin in a few seconds",
              () => {
                setTimeout(() => {
                  let newConnectorTwoButton = generateNewControllerButton(1);
                  Tutorial.showDialog(
                    "Good job making it this far. Theres not much left of the tutorials but everything from here on out is a bit more complicated and there is alot of text to read; pay attention. This new button will create a second type of connector, 'Connector 2'",
                    () => {
                      let newButtonClick = newConnectorTwoButton.addEventListener(
                        "click",
                        () => {
                          //FIXME: Why isnt this getting removed?
                          newConnectorTwoButton.removeEventListener(
                            "click",
                            newButtonClick,
                            false
                          );
                          Tutorial.showDialog(
                            "'Connector 2' allows certain 'Filter Elements' to accept a second input.",
                            () => {
                              Tutorial.showDialog(
                                "The female end of 'Connector 2' can be attached to any 'Filter Element Controller', however, the male end can only be attached to controllers that accept two inputs, these are: 'Blend', 'Composite', and 'Displacement Map'.",
                                () => {
                                  generateController(9);
                                  generateController(10);
                                  Tutorial.showDialog(
                                    "One last thing to keep in mind is that the 'Filter Element Controller' that you plug the male end of 'ConnectorTwo' must already be downstream of whatever the female end is plugged into. Give it a try, click 'Next Tutorial' when you are finished."
                                  );
                                }
                              );
                            }
                          );
                        }
                      );
                    }
                  );
                }, longTimeout * 2);
              }
            );
          }
        }, interval);
      }
    );
  },
  //fourth phase of tutorial
  tutMerge: () => {
    nextTutorialButton.onclick = Tutorial.endTutorial;
  },
  endTutorial: () => {},
  resetTutorial: () => {
    clearInterval(1);
    layersToReset.forEach((layer) => {
      layer.innerHTML = "";
    });
    Tutorial.filterSocket.prev = null;
    updateAllFilters();
  },
  showDialog: (text, closeFunction) => {
    dialogText.innerHTML = text;
    gsap.set(dialogBox, { visibility: "visible" });
    gsap.to(dialogBox, { duration: dur, opacity: 1 });
    dialogClose.onclick = () => {
      Tutorial.hideDialog(closeFunction);
    };
  },
  hideDialog: (callback) => {
    let hide = gsap.timeline();
    hide.to(dialogBox, { duration: dur, opacity: 0 });
    hide.set(dialogBox, { visibility: "hidden" });
    setTimeout(callback, timeout);
  },
};

tutorialPrompt = function () {
  let tutorial = confirm("Would you like to run the tutorial?");
  tutorial
    ? setTimeout(Tutorial.runTutorial, timeout)
    : setTimeout(noTutorial, timeout);
};

noTutorial = function () {
  generateAllNewControllerButtons();
  generateAllControllers();
};
//END OF TUTORIAL STUFF

runFeDeadBoard = function () {
  initializeGrid();
  importExternalSvg();
};

runFeDeadBoard();
