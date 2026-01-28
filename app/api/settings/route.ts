import { NextRequest, NextResponse } from 'next/server';
import {
  loadSettings,
  updateSettings,
  addLibrary,
  updateLibrary,
  removeLibrary,
} from '@/services/settings-service';
import { settingsSchema } from '@/lib/utils/validation';

/**
 * GET /api/settings
 * Get application settings
 */
export async function GET() {
  try {
    const settings = await loadSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error loading settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Update application settings
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate settings
    const validated = settingsSchema.partial().parse(body);

    const updated = await updateSettings(validated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Add a new library
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, path, organization } = body;

    if (!name || !path || !organization) {
      return NextResponse.json(
        { error: 'name, path, and organization are required' },
        { status: 400 }
      );
    }

    const library = await addLibrary({ name, path, organization });
    return NextResponse.json(library);
  } catch (error) {
    console.error('Error adding library:', error);
    return NextResponse.json(
      { error: 'Failed to add library' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings
 * Remove a library
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const libraryId = searchParams.get('id');

    if (!libraryId) {
      return NextResponse.json(
        { error: 'library id is required' },
        { status: 400 }
      );
    }

    const success = await removeLibrary(libraryId);

    if (!success) {
      return NextResponse.json(
        { error: 'Library not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing library:', error);
    return NextResponse.json(
      { error: 'Failed to remove library' },
      { status: 500 }
    );
  }
}
