import Lesson from '../models/lesson.js';
import LessonBooking from '../models/lessonBooking.js';

export const getTutorStats = async (req, res) => {
  try {
    const tutorId = req.user.userId;

    const lessons = await Lesson.find({ tutor: tutorId });
    const lessonIds = lessons.map(l => l._id);

    const bookings = await LessonBooking.find({ lesson: { $in: lessonIds } });
    const paidBookings = bookings.filter(b => b.paymentStatus === 'Paid');

    const lessonPriceMap = {};
    lessons.forEach(l => { lessonPriceMap[l._id.toString()] = l.price || 0; });

    const totalEarnings = paidBookings.reduce(
      (sum, b) => sum + (lessonPriceMap[b.lesson.toString()] || 0), 0
    );

    const uniqueStudents = new Set(bookings.map(b => b.student.toString()));

    const recentBookings = await LessonBooking.find({ lesson: { $in: lessonIds } })
      .populate('student', 'name email avatar')
      .populate('lesson', 'title price')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalLessons: lessons.length,
        totalBookings: bookings.length,
        totalStudents: uniqueStudents.size,
        totalEarnings,
      },
      recentBookings,
    });
  } catch (error) {
    console.error('Get Tutor Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

export const getTutorBookings = async (req, res) => {
  try {
    const tutorId = req.user.userId;

    const lessons = await Lesson.find({ tutor: tutorId }).select('_id title price');
    const lessonIds = lessons.map(l => l._id);

    const bookings = await LessonBooking.find({ lesson: { $in: lessonIds } })
      .populate('student', 'name email avatar')
      .populate('lesson', 'title price availableDays availableTimeSlots instrument')
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (error) {
    console.error('Get Tutor Bookings Error:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
};

export const getTutorEarnings = async (req, res) => {
  try {
    const tutorId = req.user.userId;

    const lessons = await Lesson.find({ tutor: tutorId });
    const lessonIds = lessons.map(l => l._id);
    const lessonPriceMap = {};
    lessons.forEach(l => { lessonPriceMap[l._id.toString()] = l.price || 0; });

    const paidBookings = await LessonBooking.find({
      lesson: { $in: lessonIds },
      paymentStatus: 'Paid',
    })
      .populate('student', 'name email')
      .populate('lesson', 'title price')
      .sort({ updatedAt: -1 });

    const totalEarnings = paidBookings.reduce(
      (sum, b) => sum + (b.lesson?.price || 0), 0
    );

    // Earnings by lesson
    const byLessonMap = {};
    paidBookings.forEach(b => {
      const id = b.lesson?._id?.toString();
      if (!id) return;
      if (!byLessonMap[id]) byLessonMap[id] = { lesson: b.lesson, count: 0, total: 0 };
      byLessonMap[id].count++;
      byLessonMap[id].total += b.lesson?.price || 0;
    });

    // Monthly breakdown
    const monthlyMap = {};
    paidBookings.forEach(b => {
      const d = new Date(b.updatedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthlyMap[key]) monthlyMap[key] = { key, label, total: 0 };
      monthlyMap[key].total += b.lesson?.price || 0;
    });

    const monthly = Object.values(monthlyMap).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 6);

    res.json({
      totalEarnings,
      byLesson: Object.values(byLessonMap),
      monthly,
      history: paidBookings.map(b => ({
        _id: b._id,
        student: b.student,
        lesson: b.lesson,
        amount: b.lesson?.price || 0,
        paidAt: b.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get Tutor Earnings Error:', error);
    res.status(500).json({ message: 'Failed to fetch earnings' });
  }
};
