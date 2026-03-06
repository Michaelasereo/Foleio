'use server';

import { prisma } from '@foleio/database';
import { randomBytes } from 'crypto';
import {
  sendBookingConfirmation,
  sendBookingStatusUpdate,
  sendContentPurchaseEmail,
  sendSubscriptionConfirmation,
} from '@/lib/email/send';

// Note: This uses a placeholder email implementation
// In production, integrate with Resend, SendGrid, or similar

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://foleio.com';

// Send booking confirmation email to customer
export async function sendBookingConfirmationEmail(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        priceListItem: true,
        creator: {
          select: {
            displayName: true,
            username: true,
          },
        },
      },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    const trackingUrl = `${APP_URL}/tracking/${booking.trackingToken}`;
    
    // Format the booking date
    const formattedDate = new Date(booking.bookingDate).toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Format price
    const formattedPrice = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(booking.totalAmount / 100);

    const emailContent = {
      to: booking.customerEmail,
      subject: `Booking Confirmed with ${booking.creator.displayName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Booking Confirmed! 🎉</h1>
          
          <p>Hi ${booking.customerName},</p>
          
          <p>Your booking with <strong>${booking.creator.displayName}</strong> has been confirmed!</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Booking Details</h3>
            <p><strong>Service:</strong> ${booking.priceListItem.name}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Amount Paid:</strong> ${formattedPrice}</p>
          </div>
          
          <p>Track your booking status using the link below:</p>
          
          <a href="${trackingUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
            Track My Booking
          </a>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You'll need to enter your email (${booking.customerEmail}) to view the full booking details.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px;">
            If you didn't make this booking, please ignore this email.
          </p>
        </div>
      `,
    };

    await sendBookingConfirmation({
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      creatorName: booking.creator.displayName,
      serviceName: booking.priceListItem.name,
      bookingDate: formattedDate,
      amount: booking.totalAmount / 100,
      trackingToken: booking.trackingToken,
      trackingUrl,
    });

    return { success: true, trackingUrl };
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return { error: 'Failed to send email' };
  }
}

// Resend tracking email
export async function resendTrackingEmail(trackingToken: string, email: string) {
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        trackingToken,
        customerEmail: email.toLowerCase(),
      },
    });

    if (!booking) {
      return { error: 'Booking not found or email does not match' };
    }

    return sendBookingConfirmationEmail(booking.id);
  } catch (error) {
    console.error('Error resending tracking email:', error);
    return { error: 'Failed to resend email' };
  }
}

// Subscribe to creator updates
export async function subscribeToCreator(creatorId: string, email: string) {
  try {
    // Verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        displayName: true,
        username: true,
      },
    });

    if (!creator) {
      return { error: 'Creator not found' };
    }

    // Check if already subscribed
    const existing = await prisma.emailSubscription.findFirst({
      where: {
        creatorId,
        email: email.toLowerCase(),
      },
    });

    if (existing) {
      if (existing.isActive) {
        return { error: 'Already subscribed' };
      }
      // Reactivate subscription
      await prisma.emailSubscription.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      return { success: true, message: 'Subscription reactivated' };
    }

    // Generate unsubscribe token
    const unsubscribeToken = randomBytes(16).toString('hex');

    // Create subscription
    const subscription = await prisma.emailSubscription.create({
      data: {
        creatorId,
        email: email.toLowerCase(),
        unsubscribeToken,
      },
    });

    // Send confirmation email
    const unsubscribeUrl = `${APP_URL}/unsubscribe/${unsubscribeToken}`;
    
    const emailContent = {
      to: email,
      subject: `Subscribed to ${creator.displayName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">You're Subscribed! 🎉</h1>
          
          <p>You're now subscribed to updates from <strong>${creator.displayName}</strong>.</p>
          
          <p>You'll receive notifications about new content, tutorials, and updates.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px;">
            Don't want these emails? <a href="${unsubscribeUrl}">Unsubscribe here</a>
          </p>
        </div>
      `,
    };

    await sendSubscriptionConfirmation({
      fanEmail: email,
      creatorName: creator.displayName,
      creatorUsername: creator.username,
      planName: 'Email Updates',
      amount: 0,
      nextBillingDate: 'N/A',
    });

    return { success: true, data: subscription };
  } catch (error) {
    console.error('Error subscribing to creator:', error);
    return { error: 'Failed to subscribe' };
  }
}

// Unsubscribe from creator
export async function unsubscribeFromCreator(unsubscribeToken: string) {
  try {
    const subscription = await prisma.emailSubscription.findFirst({
      where: { unsubscribeToken },
    });

    if (!subscription) {
      return { error: 'Invalid unsubscribe link' };
    }

    await prisma.emailSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false },
    });

    return { success: true, message: 'Successfully unsubscribed' };
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return { error: 'Failed to unsubscribe' };
  }
}

// Send service day reminder (to be called by cron job)
export async function sendServiceDayReminder(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        priceListItem: true,
        creator: {
          select: {
            displayName: true,
            username: true,
          },
        },
      },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    const trackingUrl = `${APP_URL}/tracking/${booking.trackingToken}`;
    
    const formattedDate = new Date(booking.bookingDate).toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emailContent = {
      to: booking.customerEmail,
      subject: `Reminder: Your booking with ${booking.creator.displayName} is tomorrow!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Reminder: Service Tomorrow! 📅</h1>
          
          <p>Hi ${booking.customerName},</p>
          
          <p>This is a reminder that your booking with <strong>${booking.creator.displayName}</strong> is tomorrow!</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Service:</strong> ${booking.priceListItem.name}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
          </div>
          
          <a href="${trackingUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Track My Booking
          </a>
        </div>
      `,
    };

    await sendBookingStatusUpdate({
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      creatorName: booking.creator.displayName,
      serviceName: booking.priceListItem.name,
      bookingDate: formattedDate,
      status: 'service_day',
      trackingUrl,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending service day reminder:', error);
    return { error: 'Failed to send reminder' };
  }
}

// Send premium access verification code
export async function sendPremiumAccessCode(
  email: string,
  code: string,
  contentTitle: string,
  creatorName: string
) {
  try {
    const emailContent = {
      to: email,
      subject: `Your verification code: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Access Premium Content 🔓</h1>
          
          <p>Hi there,</p>
          
          <p>You requested access to premium content from <strong>${creatorName}</strong>:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>${contentTitle}</strong></p>
          </div>
          
          <p>Your verification code is:</p>
          
          <div style="background: #000; color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <span style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">${code}</span>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This code expires in <strong>15 minutes</strong>.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    await sendContentPurchaseEmail({
      email,
      creatorName,
      contentTitle,
      amount: 0,
      accessCode: code,
      accessUrl: `${APP_URL}`,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending premium access code email:', error);
    return { error: 'Failed to send verification code' };
  }
}

// Send completion notification
export async function sendCompletionEmail(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        priceListItem: true,
        creator: {
          select: {
            displayName: true,
            username: true,
          },
        },
      },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    const trackingUrl = `${APP_URL}/tracking/${booking.trackingToken}`;
    const creatorUrl = `${APP_URL}/creator/${booking.creator.username}`;

    const emailContent = {
      to: booking.customerEmail,
      subject: `Service Completed with ${booking.creator.displayName}! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Service Completed! 🎉</h1>
          
          <p>Hi ${booking.customerName},</p>
          
          <p>Great news! Your service with <strong>${booking.creator.displayName}</strong> has been marked as complete.</p>
          
          <p>We hope you had a great experience!</p>
          
          <div style="margin: 30px 0;">
            <a href="${creatorUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Book Again
            </a>
          </div>
          
          <p style="color: #666;">
            Had an issue? <a href="${trackingUrl}">View your booking</a> to request support.
          </p>
        </div>
      `,
    };

    await sendBookingStatusUpdate({
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      creatorName: booking.creator.displayName,
      serviceName: booking.priceListItem.name,
      bookingDate: new Date(booking.bookingDate).toLocaleDateString('en-NG'),
      status: 'completed',
      trackingUrl,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending completion email:', error);
    return { error: 'Failed to send email' };
  }
}

// Send collection access verification code
export async function sendCollectionAccessCodeEmail(
  email: string,
  code: string,
  collectionTitle: string,
  creatorName: string
) {
  try {
    const emailContent = {
      to: email,
      subject: `Your access code for "${collectionTitle}" - ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Access Your Collection 🎓</h1>
          
          <p>Hi there,</p>
          
          <p>You have access to the collection <strong>"${collectionTitle}"</strong> by <strong>${creatorName}</strong>!</p>
          
          <p>Your verification code is:</p>
          
          <div style="background: #000; color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <span style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">${code}</span>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This code expires in <strong>15 minutes</strong>. Enter it on the website to access your collection.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    await sendContentPurchaseEmail({
      email,
      creatorName,
      contentTitle: collectionTitle,
      amount: 0,
      accessCode: code,
      accessUrl: `${APP_URL}`,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending collection access code email:', error);
    return { error: 'Failed to send verification code' };
  }
}

// Send tutorial access verification code
export async function sendTutorialAccessCodeEmail(
  email: string,
  code: string,
  tutorialTitle: string,
  creatorName: string
) {
  try {
    const emailContent = {
      to: email,
      subject: `Your access code for "${tutorialTitle}" - ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Access Your Tutorial 🎬</h1>
          
          <p>Hi there,</p>
          
          <p>You have access to the tutorial <strong>"${tutorialTitle}"</strong> by <strong>${creatorName}</strong>!</p>
          
          <p>Your verification code is:</p>
          
          <div style="background: #000; color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <span style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">${code}</span>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This code expires in <strong>15 minutes</strong>. Enter it on the website to access your tutorial.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    await sendContentPurchaseEmail({
      email,
      creatorName,
      contentTitle: tutorialTitle,
      amount: 0,
      accessCode: code,
      accessUrl: `${APP_URL}`,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending tutorial access code email:', error);
    return { error: 'Failed to send verification code' };
  }
}

// Send collection subscription confirmation
export async function sendCollectionSubscriptionConfirmation(
  email: string,
  collectionTitle: string,
  creatorName: string,
  subscriptionType: 'one_time' | 'recurring',
  amount: number
) {
  try {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount / 100);

    const subscriptionText = subscriptionType === 'recurring' 
      ? 'Your subscription will renew monthly.'
      : 'You have lifetime access to this collection.';

    const emailContent = {
      to: email,
      subject: `Welcome to "${collectionTitle}" by ${creatorName}! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Your Collection! 🎓</h1>
          
          <p>Hi there,</p>
          
          <p>Thank you for subscribing to <strong>"${collectionTitle}"</strong> by <strong>${creatorName}</strong>!</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount Paid:</strong> ${formattedAmount}</p>
            <p><strong>Subscription Type:</strong> ${subscriptionType === 'recurring' ? 'Monthly' : 'One-time'}</p>
          </div>
          
          <p>${subscriptionText}</p>
          
          <p>To access your collection, you'll need to verify your email each time with a code we'll send you.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `,
    };

    await sendContentPurchaseEmail({
      email,
      creatorName,
      contentTitle: collectionTitle,
      amount: amount / 100,
      accessUrl: `${APP_URL}`,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending subscription confirmation:', error);
    return { error: 'Failed to send confirmation' };
  }
}

// Send tutorial purchase confirmation
export async function sendTutorialPurchaseConfirmation(
  email: string,
  tutorialTitle: string,
  creatorName: string,
  amount: number
) {
  try {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount / 100);

    const emailContent = {
      to: email,
      subject: `You purchased "${tutorialTitle}" by ${creatorName}! 🎬`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Tutorial Purchased! 🎬</h1>
          
          <p>Hi there,</p>
          
          <p>Thank you for purchasing <strong>"${tutorialTitle}"</strong> by <strong>${creatorName}</strong>!</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount Paid:</strong> ${formattedAmount}</p>
            <p><strong>Access:</strong> Lifetime</p>
          </div>
          
          <p>You now have lifetime access to this tutorial.</p>
          
          <p>To watch your tutorial, you'll need to verify your email with a code we'll send you.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #999; font-size: 12px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `,
    };

    await sendContentPurchaseEmail({
      email,
      creatorName,
      contentTitle: tutorialTitle,
      amount: amount / 100,
      accessUrl: `${APP_URL}`,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending purchase confirmation:', error);
    return { error: 'Failed to send confirmation' };
  }
}

