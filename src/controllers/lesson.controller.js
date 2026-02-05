import Lesson from '../models/lesson.js';

// Create a new lesson
export const createLesson = async (req, res) => {
  try {
    const {
      title,
      description,
      instrument,
      level,
      duration,
      price,
      maxStudents,
      availableDays,
      availableTimeSlots,
      isOnline,
      location
    } = req.body;

    // Validate required fields
    if (!title || !description || !instrument) {
      return res.status(400).json({ 
        message: 'Title, description, and instrument are required' 
      });
    }

    // Create lesson
    const lesson = await Lesson.create({
      tutor: req.user.userId,
      title,
      description,
      instrument,
      level,
      duration,
      price,
      maxStudents,
      availableDays,
      availableTimeSlots,
      isOnline,
      location: isOnline ? null : location
    });

    // Populate tutor info
    await lesson.populate('tutor', 'name email specialization');

    res.status(201).json({
      message: 'Lesson created successfully',
      lesson
    });
  } catch (error) {
    console.error('Create Lesson Error:', error);
    res.status(500).json({ message: 'Failed to create lesson' });
  }
};

// Get all lessons (public)
export const getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({ isActive: true })
      .populate('tutor', 'name email specialization avatar')
      .sort({ createdAt: -1 });

    res.json({ lessons });
  } catch (error) {
    console.error('Get Lessons Error:', error);
    res.status(500).json({ message: 'Failed to fetch lessons' });
  }
};

// Get tutor's lessons
export const getTutorLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({ tutor: req.user.userId })
      .populate('enrolledStudents', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ lessons });
  } catch (error) {
    console.error('Get Tutor Lessons Error:', error);
    res.status(500).json({ message: 'Failed to fetch lessons' });
  }
};

// Get single lesson
export const getLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id)
      .populate('tutor', 'name email specialization avatar experience hourlyRate')
      .populate('enrolledStudents', 'name email avatar');

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    res.json({ lesson });
  } catch (error) {
    console.error('Get Lesson Error:', error);
    res.status(500).json({ message: 'Failed to fetch lesson' });
  }
};

// Update lesson
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find lesson and verify ownership
    const lesson = await Lesson.findById(id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    if (lesson.tutor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this lesson' });
    }

    // Update lesson
    Object.assign(lesson, updateData);
    await lesson.save();

    await lesson.populate('tutor', 'name email specialization');

    res.json({
      message: 'Lesson updated successfully',
      lesson
    });
  } catch (error) {
    console.error('Update Lesson Error:', error);
    res.status(500).json({ message: 'Failed to update lesson' });
  }
};

// Delete lesson
export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    if (lesson.tutor.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this lesson' });
    }

    // Soft delete by marking as inactive
    lesson.isActive = false;
    await lesson.save();

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete Lesson Error:', error);
    res.status(500).json({ message: 'Failed to delete lesson' });
  }
};

// Enroll student in lesson
export const enrollInLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    if (!lesson.isActive) {
      return res.status(400).json({ message: 'Lesson is not available' });
    }

    // Check if already enrolled
    if (lesson.enrolledStudents.includes(req.user.userId)) {
      return res.status(400).json({ message: 'Already enrolled in this lesson' });
    }

    // Check max students
    if (lesson.enrolledStudents.length >= lesson.maxStudents) {
      return res.status(400).json({ message: 'Lesson is full' });
    }

    lesson.enrolledStudents.push(req.user.userId);
    await lesson.save();

    await lesson.populate('tutor', 'name email specialization');

    res.json({
      message: 'Enrolled successfully',
      lesson
    });
  } catch (error) {
    console.error('Enroll Lesson Error:', error);
    res.status(500).json({ message: 'Failed to enroll in lesson' });
  }
};
