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

enum Anchor {
	TopLeft = 'topLeft',
	TopCenter = 'topCenter',
	TopRight = 'topRight',
	MiddleLeft = 'middleLeft',
	MiddleCenter = 'middleCenter',
	MiddleRight = 'middleRight',
	BottomLeft = 'bottomLeft',
	BottomCenter = 'bottomCenter',
	BottomRight = 'bottomRight',
}

interface Layer {
	type: LayerType;
	description: string;
	originX: number;
	originY: number;
	Anchor: Anchor;
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
	style: TextStyle;
	align: CanvasTextAlign;
	baseline: CanvasTextBaseline;
	wrapText: boolean;
	// TODO wrapWithHyphens: boolean;
	scaleText: boolean;
	lineSpacing: number;
	textReplace: {
		[key: string]: string;
	};
	styleReplace: {
		[key: string]: TextStyle;
	};
}

interface TextStyle {
	font: string;
	fillStyle: string;
	dropShadow?: DropShadow;
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
	Object.assign(layer, layer.inputs);

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
		} catch (error: any) {
			console.error(`Failed to draw layer ${subLayer.description} - ${error.message}`)
		}
	}
	// Draw the new canvas to the original canvas
	context.drawImage(subCanvas, layer.originX, layer.originY, layer.width, layer.height)
}

async function drawTextLayer(layer: TextLayer, context: CanvasRenderingContext2D, inputs: InputValues) {
	// Scale Text to size
	// const scaledText = await scaleTextLayer(layer)

	// Extract all the tags from the text
	const styledText = extractTags(layer.text, layer.styleReplace, layer.style)

	// TODO - Seperate Paragraph breaks from line breaks (Two breaks in a row for paragraph?)
	const lines: {string: string, style: TextStyle}[][] = [[]]
	styledText.forEach(stringStyle => {
		const splitString = stringStyle.string.split('\n');
		do {
			lines[lines.length - 1].push({string: splitString[0], style: stringStyle.style});
			if (splitString.length > 1) {
				lines.push([]);
			}
			splitString.splice(0)
		} while (splitString.length > 0);
	})

	// TODO - Word Wrapping - Hypenation and Scaling
	

	// TODO - Write Text to a canvas to be drawn onto original

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

	// Load Custom Fonts
	template.customFonts.forEach(async font => {
		await registerFont(font.url, font)
	});

	// Set up the Canvas
	const canvas = createCanvas(template.width, template.height)
	const context = canvas.getContext("2d")

	// Invert the Layer Order
	template.layers.reverse()

	// Draw the layers
	// Use a normal for loop here to get around async anonymous functions
	for (let index = 0; index < template.layers.length; index++) {
		const layer = template.layers[index];
		try {
			await drawLayer(layer, context, inputs)
		} catch (error: any) {
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

function extractTags(string: string, tags: {[tag: string]: TextStyle}, defaultTag: TextStyle): {string: string, style: TextStyle}[] {
	const regex = /(?<!\\)(?:\\{2})*<(.+?)>(.+?)(?<!\\)(?:\\{2})*<\/\1>/g;
	const output: {string: string, style: TextStyle}[] = [];
	const nextCheck  = [{string, style: defaultTag}];

	while (nextCheck.length > 0) {
		// Update the match
		const match = regex.exec(nextCheck[nextCheck.length - 1].string);
		
		// If no match just move to the output and continue
		if (!match) {
			let currentTest = nextCheck.pop();
			if (!currentTest) continue;
			output.push(currentTest);
			continue;
		}

		// Pull any varaibles we need
		const tag = match[1];
		const text = match[2];
		const index = match.index;
		const string = nextCheck[nextCheck.length - 1].string;
		const style = nextCheck[nextCheck.length - 1].style;

		// Remove that check from the stack
		nextCheck.pop();

		// Push any text before the match to the output
		if (string.substring(0, index)) {
			output.push({
				string: string.substring(0, index),
				style: style
			});
		}

		// Push any text after the output onto the stack to check later
		if (string.substring(regex.lastIndex)) {
			nextCheck.push({
				string: string.substring(regex.lastIndex),
				style: style
			});
		}

		// Push the matched text onto the stack to check for nested tags
		if (text) {
			nextCheck.push({
				string: text,
				style: tags[tag] || style
			});
		}

		// Update the regex so we check from the start
		regex.lastIndex = 0;
	}

	return output;
}

function wrapText(styledTextLines: {string: string, style: TextStyle}[][], maxWidth: number) {
	// TODO make this work
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
	let stringsWithFonts: {text: string, font: TextStyle}[] = [{
		text,
		font: {
			font: layer.font,
			fillStyle: layer.fillStyle,
			dropShadow: layer.dropShadow
		}
	}]

	for (const seperatorString in layer.styleReplace) {
		if (Object.prototype.hasOwnProperty.call(layer.styleReplace, seperatorString)) {
			const font = layer.styleReplace[seperatorString].font;
			const fillStyle = layer.styleReplace[seperatorString].fillStyle;
			const dropShadow = layer.styleReplace[seperatorString].dropShadow == undefined ? layer.dropShadow : layer.styleReplace[seperatorString].dropShadow;
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

function processConditions(conditions: Condition | undefined, inputs: InputValues): boolean {
	// If no conditions are specified default true
	if (conditions == undefined) {
		return true
	}

	// create an array of results
	const results = []

	// Setup our operator functions
	const operatorFunctions: { [operator: string]: (param1: any, key: string) => boolean } = {
        "$match": (pattern: RegExp, key: string) => inputs[key]?.match(pattern),
        "$lt": (value: any, key: string) => inputs[key] < value,
        "$lte": (value: any, key: string) => inputs[key] <= value,
        "$gt": (value: any, key: string) => inputs[key] > value,
        "$gte": (value: any, key: string) => inputs[key] >= value,
        "$in": (values: any[], key: string) => values.includes(inputs[key])
    }

	const subConditionOperatorFunctions: { [operator: string]: (param1: any) => boolean } = {
		"$or": (subConditions: Condition[]) =>  subConditions.some(condition => processConditions(condition, inputs)),
		"$not": (condition: Condition) => !processConditions(condition, inputs)
    }

	// For each key defined in the conditions
	for (const key in conditions) {
		if (!Object.prototype.hasOwnProperty.call(conditions, key)) continue;
        const element = conditions[key];

		// If key is an subConditionOperator (i.e., a top level operator)
        if (typeof subConditionOperatorFunctions[key] === "function") {
            results.push(subConditionOperatorFunctions[key](element))
        } else if (typeof element == "object") {
			// If element is an object (i.e., containing operators)
            for (const subCondition in element) {
				if (!Object.prototype.hasOwnProperty.call(element, subCondition)) continue;
                if (typeof operatorFunctions[subCondition] === "function") {
                    results.push(operatorFunctions[subCondition](element[subCondition], key))
                }
            }
        } else {
			// Otherwise its a value and just compare to inputs
            results.push(element === inputs[key])
        }
    }

	// Return true if there are no falses in our results
    return !results.includes(false)
}