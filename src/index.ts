import { registerFont, createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';

interface Template {
	name: string;
	author: string;
	previewImage: URL;
	width: number;
	height: number;
	dpi: number;
	customFonts: CustomFont[];
	inputs: InputValues;
	layers: Layer[];
}

interface CustomFont extends FontFaceDescriptors {
	family: string;
	url: string;
}

interface Condition {
	[key: string]: any;
}

enum InputType {
	Text = 'text',
	File = 'file',
	Combo = 'combo',
	TextArea = 'textarea',
	Checkbox = 'checkbox',
}

interface Input {
	name: string;
	type: InputType;
	description: string;
	default?: any;
	help?: string;
	halfSize?: boolean;
	options?: string[];
}

enum LayerType {
	Group = 'group',
	Text = 'text',
	Image = 'image',
	Fill = 'fill',
	Mask = 'mask',
}

enum ImageScaleType {
	Fill = 'fill',
	Fit = 'fit',
	Stretch = 'stretch',
}

enum TextAlign {
	Start = 'start',
	Center = 'center',
	Right = 'right',
}

enum TextBaseline {
	Top = 'top',
	Middle = 'middle',
	Bottom = 'bottom',
}

interface Layer {
	type: LayerType;
	description: string;
	originX: number;
	originY: number;
	width: number;
	height: number;
	conditions?: Condition;
	inputs?: {
		[key: string]: any;
	};
	dropShadow?: DropShadow;
}

interface GroupLayer extends Layer {
	layers: Layer[];
}

interface TextLayer extends Layer {
	text: string;
	font: string;
	fillStyle: string;
	align: TextAlign;
	baseline: TextBaseline;
	wrapText: boolean;
	scaleText: boolean;
	lineSpacing: number;
	textReplace: {
		[key: string]: string;
	};
	fontReplace: {
		[key: string]: {
			dropShadow: DropShadow;
			font: string;
			fillStyle: string;
		};
	};
}

interface ImageLayer extends Layer {
	url: string;
	scale: ImageScaleType;
}

interface MaskLayer extends ImageLayer {
	operations: GlobalCompositeOperation[];
}

interface FillLayer extends Layer {
	fillStyle: string;
}

interface InputValues {
	[inputName: string]: any;
}

interface DropShadow {
	offsetX: number;
	offsetY: number;
	shadowBlur: number;
	shadowColor: string;
}

async function drawLayer(layer: Layer, context: CanvasRenderingContext2D, inputs: InputValues) {
	// Check the Layer Conditions
	if (!(processConditions(layer.conditions, inputs))) {
		console.debug("Conditions for layer " + layer.description + " not met")
		// If the layer conditions are not met just return doing nothing
		return
	}

	// Substitute layer properties from inputs
	for (const layerProperty in layer.inputs) {
		if (Object.prototype.hasOwnProperty.call(layer.inputs, layerProperty)) {
			const inputName = layer.inputs[layerProperty];
			if (inputs[inputName]) {
				layer[layerProperty] = inputs[inputName]
			}
		}
	}

	// Draw the layers
	switch (layer.type) {
		case LayerType.Group: {
			await drawGroupLayer(layer as GroupLayer, context, inputs);
			break;
		}

		case LayerType.Text: {
			await drawTextLayer(layer as TextLayer, context, inputs);
			break;
		}
	
		case LayerType.Image: {
			await drawImageLayer(layer as ImageLayer, context, inputs);
			break;
		}

		case LayerType.Fill:
			await drawFillLayer(layer as FillLayer, context, inputs);
			break;
		
		case LayerType.Mask: {
			await drawMaskLayer(layer as MaskLayer, context, inputs);
			break;
		}

		default:
			console.error("Unknown Layer type")
			break;
	}
}

async function drawGroupLayer(layer: GroupLayer, context: CanvasRenderingContext2D, inputs: InputValues) {
	// Create a new Canvas for the group
	const subCanvas = createCanvas(layer.width, layer.height)
	const subContext = subCanvas.getContext("2d")
	// Draw the sublayers to the new canvas
	for (let index = 0; index < layer.layers.length; index++) {
		const subLayer = layer.layers[index];
		try {
			await drawLayer(subLayer, subContext, inputs)
		} catch (error) {
			console.error(`Failed to draw layer ${subLayer.description} - ${error.message}`)
		}
	}
	// Draw the new canvas to the original canvas
	context.drawImage(subCanvas, layer.originX, layer.originY, layer.width, layer.height)
}

async function drawTextLayer(layer: TextLayer, context: CanvasRenderingContext2D, inputs: InputValues) {
	// Scale Text to size
	const scaledText = await scaleTextLayer(layer)
	// Draw the text to the canvas
	context.drawImage(scaledText, layer.originX, layer.originY, layer.width, layer.height)
}

async function drawImageLayer(layer: ImageLayer, context: CanvasRenderingContext2D, inputs: InputValues) {
	// Scale Image to size
	const scaledImage = await scaleImageLayer(layer as ImageLayer)
	// Draw the scaled image to the canvas
	context.drawImage(scaledImage, layer.originX, layer.originY, layer.width, layer.height)
}

async function drawFillLayer(layer: FillLayer, context: CanvasRenderingContext2D, inputs: InputValues) {
	// Draw a filled rectangle
	context.save()
	context.fillStyle = layer.fillStyle
	context.fillRect(layer.originX, layer.originY, layer.width, layer.height)
	context.restore()
}

async function drawMaskLayer(layer: MaskLayer, context: CanvasRenderingContext2D, inputs: InputValues) {
	// Scale Image to size
	const maskImage = await scaleImageLayer(layer)
	// Draw the scaled image to the canvas for each operation
	layer.operations.forEach(operation => {
		context.save()
		context.globalCompositeOperation = operation
		context.drawImage(maskImage, layer.originX, layer.originY, layer.width, layer.height)
		context.restore()
	});
}

export async function generateCard(template: Template, inputs: InputValues) {
	// 69.6mm x 95.0mm (63mm x 88mm with bleed)
	// 300 dpi
	// const canvas = createCanvas(822, 1122)
	// 600 dpi
	// const canvas = createCanvas(1644, 2244)
	// 1200 dpi
	// let canvas = createCanvas(3288, 4288)

	// Load Custom Fonts
	template.customFonts.forEach(async font => {
		await registerFont(font.url, font)
	});

	// Set up the Canvas
	const canvas = createCanvas(template.width, template.height)
	const context = canvas.getContext("2d")

	// Fill the base Layer
	//context.fillStyle = template.base
	//context.fillRect(0, 0, template.width, template.height)

	// Invert the Layer Order
	template.layers.reverse()

	// Draw the layers
	// Use a normal for loop here to get around async anonymous functions
	for (let index = 0; index < template.layers.length; index++) {
		const layer = template.layers[index];
		try {
			await drawLayer(layer, context, inputs)
		} catch (error) {
			console.error(`Failed to draw layer ${layer.description} - ${error.message}`)
		}
	}

	// Return the completed Canvas
	return canvas
}

// Function that takes an image layer and returns a the image cropped and scaled as a canvas
async function scaleImageLayer(layer: ImageLayer) {
	if (layer.type != "image" && layer.type != "mask") {
		throw new Error("Tried to scale a non image layer")
	} else if (layer.url == "") {
		throw new Error("Layer has no URL")
	}

	// Create a new canvas to return layer
	const canvas = createCanvas(layer.width, layer.height)
	const context = canvas.getContext("2d")

	// Get the image
	const image = await loadImage(layer.url)

	let x = 0
	let y = 0 
	let ratio = 1
	let newWidth = 0
	let newHeight = 0

	switch (layer.scale) {
		case "fill":
			// Fill the layer bounds with image (image may go outside of bounds and be cropped)
			// Scale the image to match width
			ratio = image.width / image.height;
			newWidth = layer.width;
			newHeight = newWidth / ratio;
			x = 0
			y = (newHeight - layer.height) / -2
			if (newHeight < layer.height) {
				// If height is not enough, scale to match
				newHeight = layer.height;
				newWidth = newHeight * ratio;
				x = (newWidth - layer.width) / -2
				y = 0
			}
			break;
		case "fit":
			// Fit the image to layer bounds (Image may have whitespace on edge)
			// Scale image to match width
			ratio = image.width / image.height;
			newWidth = layer.width;
			newHeight = newWidth / ratio;
			x = 0
			y = (newHeight - layer.height) / 2
			if (newHeight > layer.height) {
				// If height is too much, scale to match
				newHeight = layer.height;
				newWidth = newHeight * ratio;
				x = (newWidth - layer.width) / 2
				y = 0
			}
			break;
		case "stretch":
			// Stretch the image to match the layer bounds (Image may be distorted)
			// Just straight up set the width and height to match
			newWidth = layer.width;
			newHeight = layer.height;
			break;
		default:
			break;
	}

	// Set up the drop shadow
	if (layer.dropShadow) {
		context.shadowOffsetX = layer.dropShadow.offsetX
		context.shadowOffsetY = layer.dropShadow.offsetY
		context.shadowBlur = layer.dropShadow.shadowBlur
		context.shadowColor = layer.dropShadow.shadowColor
	}

	// Write the image to the canvas (crops the image)
	context.drawImage(image, x, y, newWidth, newHeight)

	return canvas
}

// Function that takes a text layer and returns a the text scaled, wrapped as the correct font as a canvas
function scaleTextLayer(layer: TextLayer) {
	// Make sure we've actually got a text layer
	if (layer.type != "text") {
		throw new Error("Tried to scale a non image layer")
	}

	// Create the canvas that will be returned
	const canvas = createCanvas(layer.width, layer.height)
	const context = canvas.getContext("2d")

	// Set up the context
	context.textAlign = "start"
	context.textBaseline = "alphabetic"
	context.fillStyle = layer.fillStyle

	// Do any text replacements we need
	let text = layer.text
	for (const sourceString in layer.textReplace) {
		if (Object.prototype.hasOwnProperty.call(layer.textReplace, sourceString)) {
			const replacementString = layer.textReplace[sourceString];
			text = text.replaceAll(sourceString, replacementString)
		}
	}

	// Build an array of fonts & Strings
	// This was the most confusing shit ever to work through
	let stringsWithFonts = []
	const temp = {
		text,
		font: layer.font,
		fillStyle: layer.fillStyle,
		dropShadow: layer.dropShadow
	}
	stringsWithFonts.push(temp)
	for (const seperatorString in layer.fontReplace) {
		if (Object.prototype.hasOwnProperty.call(layer.fontReplace, seperatorString)) {
			const font = layer.fontReplace[seperatorString].font;
			const fillStyle = layer.fontReplace[seperatorString].fillStyle;
			const dropShadow = layer.fontReplace[seperatorString].dropShadow == undefined ? layer.dropShadow : layer.fontReplace[seperatorString].dropShadow;
			// Seperator Boundaries
			const stringWithFontsNew = []
			const seperatorStart = seperatorString.substring(0, seperatorString.length / 2) //First half of string
			const seperatorEnd = seperatorString.substring(seperatorString.length / 2) //Second half of string

			stringsWithFonts.forEach(stringFont => {
				const firstSplit = stringFont.text.split(seperatorStart)
				if (firstSplit.length > 1) {
					// The Seperator was found
					firstSplit.forEach(toBeClosed => {
						const secondSplit = toBeClosed.split(seperatorEnd)
						let newStringFont = {}
						if (secondSplit.length == 1) {
							if (secondSplit[0] != "") {
								// Only put the string in if it's not empty
								newStringFont = {}
								newStringFont["text"] = secondSplit[0]
								newStringFont["font"] = stringFont.font
								newStringFont["fillStyle"] = stringFont.fillStyle
								newStringFont["dropShadow"] = stringFont.dropShadow
								stringWithFontsNew.push(newStringFont)
							}
						} else if (secondSplit.length == 2) {
							newStringFont = {}
							newStringFont["text"] = secondSplit[0]
							newStringFont["font"] = font
							newStringFont["fillStyle"] = fillStyle
							newStringFont["dropShadow"] = dropShadow
							stringWithFontsNew.push(newStringFont)
							if (secondSplit[1] != "") {
								newStringFont = {}
								newStringFont["text"] = secondSplit[1]
								newStringFont["font"] = stringFont.font
								newStringFont["fillStyle"] = stringFont.fillStyle
								newStringFont["dropShadow"] = stringFont.dropShadow
								stringWithFontsNew.push(newStringFont)
							}
						} else {
							// This shouldn't really happen - more than one seperator end found
							const finalString = secondSplit.pop
							const firstString = secondSplit.join("")
							newStringFont = {}
							newStringFont["text"] = firstString
							newStringFont["font"] = stringFont.font
							newStringFont["fillStyle"] = stringFont.fillStyle
							newStringFont["dropShadow"] = stringFont.dropShadow
							stringWithFontsNew.push(newStringFont)
							if (finalString != "") {
								newStringFont = {}
								newStringFont["text"] = finalString
								newStringFont["font"] = font
								newStringFont["fillStyle"] = fillStyle
								newStringFont["dropShadow"] = dropShadow
								stringWithFontsNew.push(newStringFont)
							}
						}
					});
				} else {
					// No seperator found
					stringWithFontsNew.push(stringFont)
				}
			});
			stringsWithFonts = stringWithFontsNew
		}
	}

	const lineBreaks = [{
		"height": 0,
		"baselineHeight": 0,
		"width": 0,
		"stringFonts": []
	}]

	stringsWithFonts.forEach(stringFont => {
		// Split at line breaks
		const lines = stringFont.text.split("\n")
		// Put the split stringFonts into the lineBreaks array
		// The first one should always be on the current line
		let newStringFont = {
			text: lines[0],
			font: stringFont.font,
			fillStyle: stringFont.fillStyle,
			dropShadow: stringFont.dropShadow
		}
		lineBreaks[lineBreaks.length - 1].stringFonts.push(newStringFont)
		// Calculate line metrics
		context.font = newStringFont.font
		context.fillStyle = newStringFont.fillStyle
		const metrics = context.measureText(newStringFont.text)
		const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
		lineBreaks[lineBreaks.length - 1].height = height > lineBreaks[lineBreaks.length - 1].height ? height : lineBreaks[lineBreaks.length - 1].height
		lineBreaks[lineBreaks.length - 1].baselineHeight = metrics.fontBoundingBoxAscent > lineBreaks[lineBreaks.length - 1].baselineHeight ? metrics.fontBoundingBoxAscent : lineBreaks[lineBreaks.length - 1].baselineHeight
		lineBreaks[lineBreaks.length - 1].width += metrics.width
		// everything else goes onto a new line
		if (lines.length > 1) {
			lineBreaks.push({
				"height": 0,
				"baselineHeight": 0,
				"width": 0,
				"stringFonts": []
			})
			// Regular for loop so we can start at 1
			for (let index = 1; index < lines.length; index++) {
				const line = lines[index];
				newStringFont = {
					text: line,
					font: stringFont.font,
					fillStyle: stringFont.fillStyle,
					dropShadow: stringFont.dropShadow
				}
				lineBreaks[lineBreaks.length - 1].stringFonts.push(newStringFont)
				// Calculate line metrics
				context.font = newStringFont.font
				context.fillStyle = newStringFont.fillStyle
				const metrics = context.measureText(newStringFont.text)
				const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
				lineBreaks[lineBreaks.length - 1].height = height > lineBreaks[lineBreaks.length - 1].height ? height : lineBreaks[lineBreaks.length - 1].height
				lineBreaks[lineBreaks.length - 1].baselineHeight = metrics.fontBoundingBoxAscent > lineBreaks[lineBreaks.length - 1].baselineHeight ? metrics.fontBoundingBoxAscent : lineBreaks[lineBreaks.length - 1].baselineHeight
				lineBreaks[lineBreaks.length - 1].width += metrics.width
			}
		}
	})

	let totalHeight = 0
	let totalWidth = 0
	let scale = 1
	let finalLines

	// Always run at least once
	do {
		// Clone the linebreaks array so we have a fresh array each loop
		// I know this is a really dumb way of doing it but I really want an entirely new object with no references
		finalLines = JSON.parse(JSON.stringify(lineBreaks))

		// Word Wrapping
		if (layer.wrapText) {
			// Split each lines stringFonts into words as stringFonts
			finalLines.forEach((line, index) => {
				const splitLine = []
				line.stringFonts.forEach(stringFont => {
					const words = stringFont.text.split(" ")
					words.forEach(wordString => {
						const newStringFont = {}
						newStringFont["text"] = wordString
						newStringFont["font"] = stringFont.font
						newStringFont["fillStyle"] = stringFont.fillStyle
						newStringFont["dropShadow"] = stringFont.dropShadow
						splitLine.push(newStringFont)
					});
				})
				finalLines[index].stringFonts = splitLine
			});

			// Check each line and where longer than a line, wrap to a new line
			// Regular for loop used here so we can edit the array and then process the new values
			for (let index = 0; index < finalLines.length; index++) {
				const line = finalLines[index];
				const currentLine = {
					"height":0,
					"baselineHeight": 0,
					"width": 0,
					"stringFonts": []
				}
				let lineWidth = 0
				// Regular for loop used here so we can break from it to stop processing words processed in next line
				for (let wordIndex = 0; wordIndex < line.stringFonts.length; wordIndex++) {
					const wordFont = line.stringFonts[wordIndex];
					// Make sure we measure with the space added back
					const spacedText = wordIndex == 0 ? wordFont.text : " " + wordFont.text
					// Measure the line with the word added in real units
					context.font = wordFont.font
					context.fillStyle = wordFont.fillStyle
					const metrics = context.measureText(spacedText)
					lineWidth += metrics.width * scale
					if (lineWidth > layer.width) {
						// We need to wrap current word and onwards to a new line
						const nextLine = {
							"height": 0,
							"baselineHeight": 0,
							"width": 0,
							"stringFonts": []
						}
						nextLine.stringFonts = line.stringFonts.slice(wordIndex)
						finalLines.splice(index + 1, 0, nextLine)
						// Replace the current line with the new current line with words that fit
						finalLines.splice(index, 1, currentLine)
						// Stop processing the current line
						break
					} else {
						// Put the word into the current Line
						const newStringFont = {}
						newStringFont["text"] = spacedText
						newStringFont["font"] = wordFont.font
						newStringFont["fillStyle"] = wordFont.fillStyle
						newStringFont["dropShadow"] = wordFont.dropShadow
						currentLine.stringFonts.push(newStringFont)

						// Get the current Line metrics in real units
						const newHeight = (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) * scale
						const newBaselineHeight = metrics.fontBoundingBoxAscent * scale
						// Save the current line metrics
						currentLine.height = newHeight > currentLine.height ? newHeight : currentLine.height
						currentLine.baselineHeight = newBaselineHeight > currentLine.baselineHeight ? newBaselineHeight : currentLine.baselineHeight
						currentLine.width = lineWidth
					}
				}
				// Replace the current line with the new current line with words that fit
				finalLines.splice(index, 1, currentLine)
			}
		}

		// Get the total height so we know where to start our cursor
		totalHeight = 0
		if (finalLines.length <= 1) {
			finalLines[0].height = layer.wrapText ? finalLines[0].height : finalLines[0].height * scale //Make sure we're using the right units (if text was wrapped it's already in real units)
			finalLines[0].baselineHeight = layer.wrapText ? finalLines[0].baselineHeight : finalLines[0].baselineHeight * scale //Make sure we're using the right units (if text was wrapped it's already in real units)
			totalHeight = finalLines[0].height
		} else {
			finalLines.forEach(line => {
				line.height = layer.wrapText ? line.height : line.height * scale //Make sure we're using the right units (if text was wrapped it's already in real units)
				line.baselineHeight = layer.wrapText ? line.baselineHeight : line.baselineHeight * scale //Make sure we're using the right units (if text was wrapped it's already in real units)
				totalHeight += line.height * layer.lineSpacing
			});
		}

		// Get the total Width so we can scale horizontal text
		totalWidth = 0
		finalLines.forEach(line => {
			line.width = layer.wrapText ? line.width : line.width * scale //Make sure we're using the right units (if text was wrapped it's already in real units)
			totalWidth = line.width > totalWidth ? line.width : totalWidth
		});

		if (layer.scaleText && (totalHeight > layer.height || totalWidth > layer.width)) {
			// If we're going to loop, scale the context
			context.scale(0.95, 0.95)
			scale = scale * 0.95
		}
	} while (layer.scaleText && (totalHeight > layer.height || totalWidth > layer.width));

	// Set Cursor to origin
	let x = 0
	let y = 0

	// Align Vertically / Set Baseline
	switch (layer.baseline) {
		case "top":
			// Do nothing, we're already at x = 0
			break;
		case "middle":
			// move to the middle of the layer then up to the start of the text
			y = (layer.height / 2) - (totalHeight / 2)
			break;
		case "bottom":
			// move to the bottom of the layer then up to the start of the text
			y = layer.height - totalHeight
			break;
		default:
			break;
	}

	context.save()

	// Draw each line
	finalLines.forEach(line => {
		// Align Horizontally if needed
		switch (layer.align) {
			case "start":
				x = 0
				break;
			case "center":
				x = (layer.width / 2) - (line.width / 2)
				break;
			case "right":
				x = layer.width - line.width
				break;
			default:
				break;
		}

		// Move the cursor to the baseline of the current line
		y += line.baselineHeight

		// Draw each word of the line
		line.stringFonts.forEach(stringFont => {
			context.restore()
			// Set Context Style
			context.font = stringFont.font
			context.fillStyle = stringFont.fillStyle
			// Set up the drop shadow
			if (stringFont.dropShadow) {
				context.shadowOffsetX = stringFont.dropShadow.offsetX
				context.shadowOffsetY = stringFont.dropShadow.offsetY
				context.shadowBlur = stringFont.dropShadow.shadowBlur
				context.shadowColor = stringFont.dropShadow.shadowColor
			}
			// Divide by scale here so our real units turn into CSS units
			context.fillText(stringFont.text, x / scale, y / scale)
			x += context.measureText(stringFont.text).width * scale
		})

		// Move the cursor to the top of the next line
		y = y - line.baselineHeight + (line.height * layer.lineSpacing)
	});

	// Return the completed Canvas
	return canvas
}

function processConditions(conditions: Condition | undefined, inputs: InputValues) {
	// If no conditions are specified default true
	if (conditions == undefined) {
		return true
	}

	// create an array of results
	const results = []

	for (const key in conditions) {
		if (Object.prototype.hasOwnProperty.call(conditions, key)) {
			const element = conditions[key];
			
			switch (key) {
				case "$or": {
					// Process Or statement
					let anyTrue = false
					element.forEach((subConditions: Condition | undefined) => {
						const output = processConditions(subConditions, inputs)
						if (output) {
							anyTrue = true
						}
					});
					results.push(anyTrue)
					break;
				}

				case "$not": {
					// Process Or statement
					const inner = processConditions(element, inputs)
					results.push(!inner)
					break;
				}

				default:
					// If element is an object (has subconditions like < > !)
					if (typeof element == "object") {
						// For each property in the object
						for (const subCondition in element) {
							if (Object.prototype.hasOwnProperty.call(element, subCondition)) {
								const subConditionData = element[subCondition];

								// Switch on operators
								switch (subCondition) {
									case "$match":
										// Regex match
										results.push(inputs[key].match(subConditionData))
										break;
									
									case "$lt":
										// Less than
										results.push(inputs[key] < subConditionData)
										break;
									
									case "$lte":
										// Less than or equal to
										results.push(inputs[key] <= subConditionData)
										break;

									case "$gt":
										//Greater than
										results.push(inputs[key] > subConditionData)
										break;

									case "$gte":
										// Greater than or equal to
										results.push(inputs[key] >= subConditionData)
										break;

									case "$in":
										// In array
										results.push(subConditionData.includes(inputs[key]))
										break;

									default:
										break;
								}
							}
						}
					} else {
						// Check if input equals check condition
						results.push(element == inputs[key])
					}
					break;
			}
		}
	}

	// Check the results and return false if anything is false
	for (let index = 0; index < results.length; index++) {
		const result = results[index];
		if (!result) {
			return false
		}
	}
	// Nothing was false so return true
	return true
}