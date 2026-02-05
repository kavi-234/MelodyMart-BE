import Instrument from '../models/instrument.js';

// Get all instruments
export const getAllInstruments = async (req, res) => {
  try {
    const instruments = await Instrument.find().select('-image.data').sort({ createdAt: -1 });
    res.json({ instruments });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch instruments' });
  }
};

// Get single instrument
export const getInstrument = async (req, res) => {
  try {
    const instrument = await Instrument.findById(req.params.id).select('-image.data');
    if (!instrument) {
      return res.status(404).json({ message: 'Instrument not found' });
    }
    res.json({ instrument });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch instrument' });
  }
};

// Create instrument (admin only)
export const createInstrument = async (req, res) => {
  try {
    const { name, category, brand, price, stock, description } = req.body;

    const instrumentData = {
      name,
      category,
      brand,
      price: Number(price),
      stock: Number(stock),
      description
    };

    if (req.file) {
      instrumentData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }

    const instrument = await Instrument.create(instrumentData);
    
    // Return without image data to reduce response size
    const { image, ...instrumentWithoutImage } = instrument.toObject();
    res.status(201).json({ 
      message: 'Instrument added successfully', 
      instrument: { ...instrumentWithoutImage, hasImage: !!image }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create instrument' });
  }
};

// Update instrument (admin only)
export const updateInstrument = async (req, res) => {
  try {
    const { name, category, brand, price, stock, description } = req.body;

    const updateData = {
      name,
      category,
      brand,
      price: Number(price),
      stock: Number(stock),
      description
    };

    if (req.file) {
      updateData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype
      };
    }

    const instrument = await Instrument.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-image.data');

    if (!instrument) {
      return res.status(404).json({ message: 'Instrument not found' });
    }

    res.json({ message: 'Instrument updated successfully', instrument });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update instrument' });
  }
};

// Delete instrument (admin only)
export const deleteInstrument = async (req, res) => {
  try {
    const instrument = await Instrument.findByIdAndDelete(req.params.id);
    
    if (!instrument) {
      return res.status(404).json({ message: 'Instrument not found' });
    }

    res.json({ message: 'Instrument deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete instrument' });
  }
};

// Get instrument image
export const getInstrumentImage = async (req, res) => {
  try {
    const instrument = await Instrument.findById(req.params.id);
    
    if (!instrument || !instrument.image || !instrument.image.data) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.set('Content-Type', instrument.image.contentType);
    res.send(instrument.image.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch image' });
  }
};
