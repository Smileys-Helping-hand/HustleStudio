const components = {
  coil: {
    name: 'Ignition Coil',
    diagramUrl: 'diagrams/component_ignition_coil.png',
    description: 'Typical location and wiring for a coil-on-plug ignition system.',
  },
  spark_plug: {
    name: 'Spark Plug',
    diagramUrl: 'diagrams/component_spark_plug.png',
    description: 'Threaded into cylinder head; access varies by engine layout.',
  },
  injector: {
    name: 'Fuel Injector',
    diagramUrl: 'diagrams/component_injector.png',
    description: 'Mounted on fuel rail directing fuel into intake port or cylinder.',
  },
};

export default async function handler(req, res) {
  try {
    const { name } = req.query ?? {};
    if (!name) {
      return res.status(400).json({ error: 'Missing component name' });
    }

    const key = String(name).toLowerCase();
    const found = components[key];
    if (!found) {
      return res.status(404).json({ error: 'Component not found' });
    }

    return res.status(200).json(found);
  } catch (error) {
    console.error('[/api/components] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
