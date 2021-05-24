import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Previews {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    fileId: string;

    @Column()
    name: string;

    @Column()
    type: string;

    @Column({ nullable: true })
    hash: string;

    @Column({ nullable: false })
    photoId: number;

    @Column({ nullable: false })
    localUri: string;

    @Column({ nullable: false })
    userId: string;

    @Column({})
    isLocal: boolean;

    @Column({ })
    isUploaded: boolean;

    @Column({ })
    isDownloading: boolean;
}