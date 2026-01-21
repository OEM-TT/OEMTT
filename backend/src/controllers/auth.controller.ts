import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

/**
 * DEV MODE ONLY - Direct login without OTP
 * This should NEVER be available in production
 */
export async function devLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    console.log('🔧 DEV MODE: Attempting direct login for:', email);

    // Check if user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return res.status(500).json({
        error: 'Failed to check user existence',
        details: listError.message
      });
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `No user exists with email: ${email}`
      });
    }

    console.log('✅ User found:', user.id);

    // Generate a session for this user using admin API
    // We'll create a JWT that the client can use
    const { data, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (sessionError) {
      console.error('❌ Error generating session:', sessionError);
      return res.status(500).json({
        error: 'Failed to generate session',
        details: sessionError.message
      });
    }

    console.log('✅ Link generated, now verifying to create session...');

    // Now verify the OTP to create an actual session
    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      email: email,
      token: data.properties.email_otp,
      type: 'email',
    });

    if (verifyError || !sessionData.session) {
      console.error('❌ Error verifying OTP:', verifyError);
      return res.status(500).json({
        error: 'Failed to create session',
        details: verifyError?.message || 'No session returned'
      });
    }

    console.log('🔑 Session created successfully');
    console.log('  - User:', user.email);
    console.log('  - User ID:', user.id);
    console.log('  - Token expires in:', sessionData.session.expires_in, 'seconds');

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in,
        token_type: 'bearer',
      }
    });

  } catch (error: any) {
    console.error('❌ Dev login error:', error);
    next(error);
  }
}
