const { SupportTickets } = require('../config/db');

const FAQS = [
  {
    q: 'How does tractor rental work?',
    q_kn: 'ಟ್ರಾಕ್ಟರ್ ಬಾಡಿಗೆ ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ?',
    q_hi: 'ट्रैक्टर किराया कैसे काम करता है?',
    a: 'Choose your desired machine, select date and hours needed, choose with or without driver, and tap Rent Now. The machine owner will confirm and arrive at your farm field.',
  },
  {
    q: 'Can I pay cash after the field work is completed?',
    q_kn: 'ಕೆಲಸ ಮುಗಿದ ನಂತರ ಹಣ ಪಾವತಿಸಬಹುದೇ?',
    q_hi: 'क्या काम पूरा होने के बाद नकद भुगतान कर सकते हैं?',
    a: 'Yes, you can choose Cash After Work or pay securely using any UPI app like PhonePe, Google Pay, or Paytm.',
  },
  {
    q: 'Are seeds and fertilizers delivered directly to my farm?',
    q_kn: 'ಬೀಜ ಮತ್ತು ಗೊಬ್ಬರಗಳನ್ನು ನನ್ನ ತೋಟಕ್ಕೆ ತಲುಪಿಸಲಾಗುವುದೇ?',
    q_hi: 'क्या बीज और खाद सीधे मेरे खेत में पहुंचाए जाएंगे?',
    a: 'Yes! Our local delivery vans bring certified seeds, fertilizers, and farm equipment directly to your village and farm gate.',
  },
  {
    q: 'What if the rented machine breaks down during work?',
    q_kn: 'ಕೆಲಸದ ಸಮಯದಲ್ಲಿ ಯಂತ್ರ ಕೆಟ್ಟರೆ ಏನು ಮಾಡುವುದು?',
    q_hi: 'यदि काम के दौरान किराए की मशीन खराब हो जाए तो क्या होगा?',
    a: 'All machines are verified. If a breakdown occurs, you are only billed for actual hours worked, and an alternative machine will be dispatched.',
  },
];

const getFaqs = (req, res) => {
  return res.json({
    success: true,
    faqs: FAQS,
    helpline: {
      tollFree: '1800-180-1551',
      kisanKendraPhone: '+91 80 2345 6789',
      whatsapp: '+91 98765 43210',
      timing: '6:00 AM to 10:00 PM (All 7 Days)',
    },
  });
};

const createTicket = async (req, res, next) => {
  try {
    const { category, issueDescription, orderId, machineId } = req.body;
    const ticketId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;

    const ticket = await SupportTickets.create({
      id: ticketId,
      userId: req.user.id,
      farmerName: req.user.name,
      farmerPhone: req.user.mobileNumber,
      category: category || 'General Help',
      issueDescription,
      orderId: orderId || null,
      machineId: machineId || null,
      status: 'OPEN',
      response: 'Our Kisan Sahayak team has received your request and will call you within 30 minutes.',
    });

    return res.status(201).json({
      success: true,
      message: 'Support request received. A Kisan Sahayak will call your mobile shortly.',
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFaqs,
  createTicket,
};
