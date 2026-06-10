import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PostsService, CreatePostDto, QueryPostDto } from './posts.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách bài viết (public)' })
  findAll(@Query() query: QueryPostDto) {
    return this.postsService.findAll(query, undefined, false);
  }

  @Get('admin')
  @RequirePermissions('posts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách bài viết (admin)' })
  findAllAdmin(@Query() query: QueryPostDto, @CurrentUser('id') userId: number) {
    return this.postsService.findAll(query, userId, true);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết bài viết' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  @Post()
  @RequirePermissions('posts.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo bài viết' })
  create(@Body() dto: CreatePostDto, @CurrentUser('id') userId: number) {
    return this.postsService.create(dto, userId);
  }

  @Put(':id')
  @RequirePermissions('posts.update')
  @ApiBearerAuth()
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreatePostDto>) {
    return this.postsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('posts.delete')
  @ApiBearerAuth()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.remove(id);
  }

  @Post(':id/image')
  @RequirePermissions('posts.update')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/${file.filename}`;
    return this.postsService.setImage(id, imageUrl);
  }
}
