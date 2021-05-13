import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PhotoAlbums {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    previewId: number;

    @Column()
    albumId: number;
}