import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file received.' },
        { status: 400 }
      );
    }

    // Create base upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // Create type-specific directory if it doesn't exist
    const typeDir = join(uploadDir, fileType);
    if (!existsSync(typeDir)) {
      mkdirSync(typeDir, { recursive: true });
    }

    // Create a unique filename
    const uniqueFilename = `${Date.now()}-${file.name}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write the file
    const filePath = join(typeDir, uniqueFilename);
    await writeFile(filePath, buffer);

    // Return the URL for the uploaded file
    const fileUrl = `/uploads/${fileType}/${uniqueFilename}`;
    
    return NextResponse.json({ 
      message: 'File uploaded successfully',
      url: fileUrl
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file.' },
      { status: 500 }
    );
  }
} 