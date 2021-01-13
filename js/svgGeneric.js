let ns = {
  svg: "http://www.w3.org/2000/svg",
  xlink: "http://www.w3.org/1999/xlink",
  html: "http://www.w3.org/1999/xhtml",
};

//create svg elements
createSvgElement = function (element, params = {}, content) {
  let e = document.createElementNS(ns.svg, element);
  if (!params) return e;
  Object.entries(params).forEach((p) => {
    const [attribute, value] = p;
    e.setAttributeNS(null, attribute, value);
  });
  if (content) e.textContent = content;
  return e;
};

//shortcuts for common elements
defs = function (params, content) {
  return createSvgElement("defs", params, content);
};

title = function (params, content) {
  return createSvgElement("title", params, content);
};

group = function (params, content) {
  return createSvgElement("g", params, content);
};

path = function (params, content) {
  return createSvgElement("path", params, content);
};

use = function (params, content) {
  return createSvgElement("use", params, content);
};

rect = function (params, content) {
  return createSvgElement("rect", params, content);
};

circle = function (params, content) {
  return createSvgElement("circle", params, content);
};

line = function (params, content) {
  return createSvgElement("line", params, content);
};

polyline = function (params, content) {
  return createSvgElement("polyline", params, content);
};

getCenterX = function (el) {
  let bBox = el.getBoundingClientRect();
  return (bBox.x + bBox.width) / 2;
};

getCenterY = function (el) {
  let bBox = el.getBoundingClientRect();
  return (bBox.y + bBox.height) / 2;
};

//centers an element around point 0,0
//TODO: test this
centerElement = function (element) {
  let bBox = element.getBBox();
  element.style.transform = `translate(-${bBox.width / 2 + bBox.x}px, -${
    bBox.height / 2 + bBox.y
  }px)`;
};

//creates or uses existing defs to give element a coordiante system
//FIXME:this may need to change if multiple defs in different svgs with different viewports)
addToDefs = function (elem) {
  if (!document.getElementsByTagName("defs")[0]) {
    document.getElementsByTagName("svg")[0].appendChild(defs());
  }
  document.getElementsByTagName("defs")[0].appendChild(elem);
};
