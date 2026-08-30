import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BoardArticle, BoardArticles } from '../../libs/dto/board-article/board-article';
import { MemberService } from '../member/member.service';
import { AuthService } from '../auth/auth.service';
import { ViewService } from '../view/view.service';
import { Model, ObjectId } from 'mongoose';
import { BoardArticleInput, BoardArticlesInquiry } from '../../libs/dto/board-article/board-article.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { StatisticsModifier, T } from '../../libs/types/common';
import { ViewGroup } from '../../libs/enums/view.enum';
import { BoardArticleUpdate } from '../../libs/dto/board-article/board-article.update';
import { lookupMember, shapeIntoMongoObjectId } from '../../libs/types/config';

@Injectable()
export class BoardArticleService {
	constructor(
		@InjectModel('BoardArticle') private readonly boardArticleModel: Model<BoardArticle>,
		private readonly memberService: MemberService,
		private authservice: AuthService,
		private viewservice: ViewService,
	) {}

	public async createBoardArticle(memberId: ObjectId, input: BoardArticleInput): Promise<BoardArticle> {
		try {
			input.memberId = memberId;

			const result = await this.boardArticleModel.create(input);

			await this.memberService.memberStatusEditor({ _id: memberId, targetKey: 'memberArticles', modifier: 1 });

			return result;
		} catch (err) {
			console.log('Error, createBoardArticle:', (err as Error).message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getBoardArticle(articleId: ObjectId, memberId: ObjectId): Promise<BoardArticle> {
		try {
			const search: T = {
				_id: articleId,
				articleStatus: BoardArticleStatus.ACTIVE,
			};

			const targetBoardArticle = await this.boardArticleModel.findOne(search).lean().exec();
			if (!targetBoardArticle) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
			console.log('targetBoardArticle:', targetBoardArticle);

			const result = targetBoardArticle as unknown as BoardArticle;

			if (memberId) {
				const viewInput = { memberId: memberId, viewRefId: articleId, viewGroup: ViewGroup.ARTICLE };
				const newView = await this.viewservice.recordView(viewInput);
				if (newView) {
					await this.boardArticleStatusEditor({ _id: articleId, targetKey: 'articleViews', modifier: 1 });
					result.articleViews++;
				}
			}

			result.memberData = await this.memberService.getMember(null, targetBoardArticle.memberId);

			return result;
		} catch (err) {
			console.log('Error, getBoardArticle:', (err as Error).message);
			throw new BadRequestException(Message.NO_DATA_FOUND);
		}
	}

	public async updateBoardArticle(memberId: ObjectId, input: BoardArticleUpdate): Promise<BoardArticle> {
		let { articleStatus, _id } = input;
		const search: T = { _id: _id, memberId: memberId, articleStatus: BoardArticleStatus.ACTIVE };

		const result = await this.boardArticleModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (articleStatus === BoardArticleStatus.DELETE) {
			await this.memberService.memberStatusEditor({
				_id: memberId,
				targetKey: 'memberArticles',
				modifier: -1,
			});
		}

		return result;
	}

	public async getBoardArticles(memberIdd: ObjectId, input: BoardArticlesInquiry): Promise<BoardArticles> {
		const { articleCategory, text, memberId } = input.search;
		const match: T = { articleStatus: BoardArticleStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'ceatedAt']: input?.direction ?? Direction.DESC };

		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (articleCategory) match.articleCategory = { $in: articleCategory };
		if (text) match.articleTitle = { $regex: new RegExp(text, 'i') };

		console.log('match:', match);

		const result = await this.boardArticleModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							//meliked
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async boardArticleStatusEditor(input: StatisticsModifier): Promise<BoardArticle> {
		const { _id, targetKey, modifier } = input;

		const result = await this.boardArticleModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();
		if (!result) throw new Error(Message.NO_DATA_FOUND);

		return result;
	}
}
