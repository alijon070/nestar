import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MemberService } from '../member/member.service';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';
import { Comment } from '../../libs/dto/comment/comment';

@Injectable()
export class CommentService {
	constructor(
		@InjectModel('Comment') private readonly commentModel: Model<Comment>,
		private readonly memberService: MemberService,
		private authservice: AuthService,
		private viewservice: ViewService,
	) {}
}
