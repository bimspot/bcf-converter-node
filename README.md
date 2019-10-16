# BIMSPOT Model Converter

The worker takes an `ifc` file and converts them to `dae` and `glTF` based on
the instructions of [xeogl](https://github.com/xeolabs/xeogl/wiki/Importing-IFC-Models).

Furthermore, a structured `xml` and `json` is created for the purpose ID
matching.

## Overview

The worker is written in `node.js`. Connects to `RabbitMQ` and awaits for
messages in the `convert-model` channel. When receives a message, takes the UUID
out and performs the conversion tasks defined in the `convert.sh`.

Upon status change, a `json` messsage is broadcast with the outcome of the task.

```
{
  uuid: '977a05d6-3191-4a3c-8252-7120eead5b47',
  success: true (| false),
  message: 'modelConverterReady'
  desciption: 'any description or error message'
}
```

## Conversion

The source IFC (ISO-10303-21) is converted to several different formats:

- DAE and glTF for different 3D rendering engines.
- Optionally to JSON from the above XML.

The converter utilises the `IfcConvert` and `COLLADA2GLTF` libraries to create
the desired `dae` and `glTF` outputs.

## ID Matching

The service loads the generated `nodeTypes.json` file, matches the IDs
with those in the `gltf` and adds the extracted node types to the
`gltf` nodes within the extras property.

This is done so that the client would know the type of the seleted element,
which is needed for the GraphQL query to the server when requesting
additional info on the node.

## Test
123