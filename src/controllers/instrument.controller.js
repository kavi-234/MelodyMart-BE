import Instrument from '../models/instrument.js';
import cloudinary from '../utils/cloudinary.js';

export const getAllInstruments = async (req, res) => {
  try {
    const instruments = await Instrument.find().select('-image.data').sort({ createdAt: -1 });
    res.json({ instruments });
  } catch {
    res.status(500).json({ message: 'Failed to fetch instruments' });
  }
};

export const getInstrument = async (req, res) => {
  try {
    const instrument = await Instrument.findById(req.params.id).select('-image.data');
    if (!instrument) return res.status(404).json({ message: 'Instrument not found' });
    res.json({ instrument });
  } catch {
    res.status(500).json({ message: 'Failed to fetch instrument' });
  }
};

export const createInstrument = async (req, res) => {
  try {
    const { name, category, brand, price, stock, description } = req.body;
    const instrumentData = { name, category, brand, price: Number(price), stock: Number(stock), description };

    if (req.file) {
      instrumentData.imageUrl = req.file.path; // Cloudinary secure URL
    }

    const instrument = await Instrument.create(instrumentData);
    const { image, ...safe } = instrument.toObject();
    res.status(201).json({ message: 'Instrument added successfully', instrument: { ...safe, hasImage: !!(safe.imageUrl || image?.data) } });
  } catch (error) {
    console.error('Create instrument error:', error);
    res.status(500).json({ message: 'Failed to create instrument' });
  }
};

export const updateInstrument = async (req, res) => {
  try {
    const { name, category, brand, price, stock, description } = req.body;
    const updateData = { name, category, brand, price: Number(price), stock: Number(stock), description };

    if (req.file) {
      // Delete old Cloudinary image if one exists
      const existing = await Instrument.findById(req.params.id).select('imageUrl image');
      if (existing?.imageUrl) {
        const publicId = existing.imageUrl.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(`melodymart/instruments/${publicId}`).catch(() => {});
      }
      updateData.imageUrl = req.file.path;
    }

    const instrument = await Instrument.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-image.data');
    if (!instrument) return res.status(404).json({ message: 'Instrument not found' });

    res.json({ message: 'Instrument updated successfully', instrument });
  } catch (error) {
    console.error('Update instrument error:', error);
    res.status(500).json({ message: 'Failed to update instrument' });
  }
};

export const deleteInstrument = async (req, res) => {
  try {
    const instrument = await Instrument.findByIdAndDelete(req.params.id);
    if (!instrument) return res.status(404).json({ message: 'Instrument not found' });

    // Clean up Cloudinary image
    if (instrument.imageUrl) {
      const publicId = instrument.imageUrl.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`melodymart/instruments/${publicId}`).catch(() => {});
    }

    res.json({ message: 'Instrument deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Failed to delete instrument' });
  }
};

// Kept for backwards compatibility — redirects to Cloudinary URL for new items,
// serves legacy Buffer data for existing items that haven't been re-uploaded
export const getInstrumentImage = async (req, res) => {
  try {
    const instrument = await Instrument.findById(req.params.id).select('imageUrl image');
    if (!instrument) return res.status(404).json({ message: 'Image not found' });

    if (instrument.imageUrl) {
      return res.redirect(instrument.imageUrl);
    }

    if (instrument.image?.data) {
      res.set('Content-Type', instrument.image.contentType);
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(instrument.image.data);
    }

    return res.status(404).json({ message: 'Image not found' });
  } catch {
    res.status(500).json({ message: 'Failed to fetch image' });
  }
};
