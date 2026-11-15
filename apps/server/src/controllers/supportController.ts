import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { ErrorCode } from '@krishi/shared';

export async function getFaqs(req: Request, res: Response, next: NextFunction) {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category && typeof category === 'string') {
      where.category = category;
    }

    const faqs = await prisma.fAQ.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    return res.status(200).json({ success: true, data: faqs });
  } catch (err) {
    next(err);
  }
}

export async function createTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { subject, category = 'GENERAL', message, attachmentUrl } = req.body;

    if (!subject || !message) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Subject and message are required');
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        category,
        status: 'OPEN',
        priority: 'MEDIUM',
        messages: {
          create: {
            senderId: userId,
            message,
            attachmentUrl,
          },
        },
      },
      include: { messages: true },
    });

    return res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
}

export async function getTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    const where = isAdmin ? {} : { userId };

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
}

export async function getTicketById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, phone: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket) throw new AppError(404, ErrorCode.NOT_FOUND, 'Support ticket not found');

    if (!isAdmin && ticket.userId !== userId) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Access denied to this ticket');
    }

    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
}

export async function addTicketMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { message, attachmentUrl } = req.body;

    if (!message) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Message is required');
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new AppError(404, ErrorCode.NOT_FOUND, 'Support ticket not found');

    const msg = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: userId,
        message,
        attachmentUrl,
      },
    });

    return res.status(201).json({ success: true, data: msg });
  } catch (err) {
    next(err);
  }
}
