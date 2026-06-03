import Lesson from '../models/lesson.js';
import LessonBooking from '../models/lessonBooking.js';

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

// Get lessons by tutor ID (public)
export const getLessonsByTutorId = async (req, res) => {
  try {
    const { tutorId } = req.params;

    const lessons = await Lesson.find({ tutor: tutorId, isActive: true })
      .populate('tutor', 'name email specialization avatar')
      .sort({ createdAt: -1 });

    res.json({ lessons });
  } catch (error) {
    console.error('Get Lessons By Tutor Error:', error);
    res.status(500).json({ message: 'Failed to fetch lessons' });
  }
};

// Get student's enrolled lessons — returns lessons merged with per-student booking status
export const getStudentLessons = async (req, res) => {
  try {
    const studentId = req.user.userId

    // Back-fill LessonBooking records for enrollments that pre-date this feature
    const existingBookings = await LessonBooking.find({ student: studentId }).select('lesson')
    const bookedLessonIds = new Set(existingBookings.map((b) => String(b.lesson)))

    const enrolledLessons = await Lesson.find({ enrolledStudents: studentId, isActive: true }).select('_id')
    const missing = enrolledLessons.filter((l) => !bookedLessonIds.has(String(l._id)))

    if (missing.length > 0) {
      await LessonBooking.insertMany(
        missing.map((l) => ({ lesson: l._id, student: studentId })),
        { ordered: false }
      ).catch(() => {}) // ignore duplicate key errors on race conditions
    }

    const bookings = await LessonBooking.find({ student: studentId })
      .populate({
        path: 'lesson',
        match: { isActive: true },
        populate: { path: 'tutor', select: 'name email specialization avatar' },
      })
      .sort({ createdAt: -1 })

    const lessons = bookings
      .filter((b) => b.lesson)
      .map((b) => ({
        ...b.lesson.toObject(),
        bookingStatus: b.bookingStatus,
        paymentStatus: b.paymentStatus,
        bookingId: b._id,
      }))

    res.json({ lessons })
  } catch (error) {
    console.error('Get Student Lessons Error:', error)
    res.status(500).json({ message: 'Failed to fetch student lessons' })
  }
}

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

    // Convert both to strings for comparison
    const lessonTutorId = lesson.tutor.toString();
    const requestUserId = req.user.userId.toString();
    
    console.log('Update Lesson - Tutor ID:', lessonTutorId, 'User ID:', requestUserId);

    if (lessonTutorId !== requestUserId) {
      console.error('Authorization failed: Tutor mismatch');
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

    // Convert both to strings for comparison
    const lessonTutorId = lesson.tutor.toString();
    const requestUserId = req.user.userId.toString();
    
    console.log('Delete Lesson - Tutor ID:', lessonTutorId, 'User ID:', requestUserId);

    if (lessonTutorId !== requestUserId) {
      console.error('Authorization failed: Tutor mismatch');
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

    // Create per-student booking record (upsert in case of retry)
    await LessonBooking.findOneAndUpdate(
      { lesson: id, student: req.user.userId },
      { $setOnInsert: { paymentStatus: 'Pending', bookingStatus: 'Pending Payment' } },
      { upsert: true, new: true }
    );

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
