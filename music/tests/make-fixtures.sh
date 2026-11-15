#!/bin/sh
# テスト用の小さな音源を作り直すスクリプト（ffmpeg が必要）。
# できあがった fixtures/ はリポジトリに入れてあるので、ふだんは流す必要はありません。
set -eu
cd "$(dirname "$0")/fixtures"
FF="ffmpeg -hide_banner -loglevel error -y"

# ジャケット画像（色ちがいを3枚）
$FF -f lavfi -i "gradients=s=600x600:c0=0xE8552D:c1=0xF7C948:x0=0:y0=0:x1=600:y1=600:d=1" -frames:v 1 cover-a.jpg
$FF -f lavfi -i "gradients=s=600x600:c0=0x1B6CA8:c1=0x7FD1E8:x0=0:y0=600:x1=600:y1=0:d=1" -frames:v 1 cover-b.png
$FF -f lavfi -i "gradients=s=500x500:c0=0x2E7D32:c1=0xC5E1A5:x0=0:y0=0:x1=0:y1=500:d=1" -frames:v 1 cover-c.jpg

tone() { # tone <周波数> <秒>
  printf '%s' "-f lavfi -i sine=frequency=$1:duration=$2:sample_rate=44100"
}

# 1) MP3（ID3v2.3・日本語は UTF-16・ジャケットつき）アルバムA
$FF $(tone 440 3) -i cover-a.jpg -map 0:a -map 1:v -c:a libmp3lame -b:a 64k -c:v copy \
  -id3v2_version 3 -write_id3v1 0 \
  -metadata title="夏のはじまり" -metadata artist="牧場バンド" -metadata album="あおぞら牧場" \
  -metadata album_artist="牧場バンド" -metadata track="1/3" -metadata disc="1/1" \
  -metadata date="2021" -metadata genre="J-Pop" \
  -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)" -disposition:v attached_pic \
  a1-natsu.mp3

# 2) MP3（ID3v2.4・UTF-8）アルバムA 2曲目
$FF $(tone 523 2) -i cover-a.jpg -map 0:a -map 1:v -c:a libmp3lame -b:a 64k -c:v copy \
  -id3v2_version 4 -write_id3v1 0 \
  -metadata title="草の匂い" -metadata artist="牧場バンド" -metadata album="あおぞら牧場" \
  -metadata album_artist="牧場バンド" -metadata track="2/3" -metadata date="2021" -metadata genre="J-Pop" \
  -metadata:s:v comment="Cover (front)" -disposition:v attached_pic \
  a2-kusa.mp3

# 3) FLAC（Vorbis コメント・PICTURE ブロック）アルバムA 3曲目
$FF $(tone 659 2) -i cover-a.jpg -map 0:a -map 1:v -c:a flac -c:v copy \
  -metadata title="ゆうやけ" -metadata artist="牧場バンド" -metadata album="あおぞら牧場" \
  -metadata album_artist="牧場バンド" -metadata track="3" -metadata tracktotal="3" -metadata date="2021" -metadata genre="J-Pop" \
  -metadata:s:v comment="Cover (front)" -disposition:v attached_pic \
  a3-yuuyake.flac

# 4) M4A（AAC・iTunes 形式のタグ・ならび順のよみがな・PNG ジャケット）アルバムB
$FF $(tone 392 3) -i cover-b.png -map 0:a -map 1:v -c:a aac -b:a 64k -c:v copy \
  -metadata title="海へ行く道" -metadata artist="潮風トリオ" -metadata album="海岸通り" \
  -metadata album_artist="潮風トリオ" -metadata track="1/2" -metadata disc="1/1" -metadata date="2019-07-01" \
  -metadata genre="Rock" -metadata sort_name="うみへいくみち" -metadata sort_artist="しおかぜとりお" \
  -metadata sort_album="かいがんどおり" -metadata composer="山田太郎" -metadata lyrics="海へ行く道は
まっすぐで
風が吹いている" \
  -disposition:v attached_pic \
  b1-umi.m4a

# 5) OGG Vorbis アルバムB 2曲目（ジャケットなし）
$FF $(tone 349 2) -c:a libvorbis -q:a 2 \
  -metadata title="Seaside Walk" -metadata artist="潮風トリオ" -metadata album="海岸通り" \
  -metadata album_artist="潮風トリオ" -metadata tracknumber="2" -metadata date="2019" -metadata genre="Rock" \
  b2-seaside.ogg

# 6) Opus（OGG コンテナ）シングル
$FF $(tone 300 2) -c:a libopus -b:a 48k \
  -metadata title="Opus Song" -metadata artist="Tester" -metadata album="Singles" -metadata tracknumber="1" \
  c1-opus.opus

# 7) WAV（タグなし。ファイル名から題名をとる確認用）
$FF $(tone 220 2) -c:a pcm_s16le -ac 1 -ar 11025 "07 たぐなしの曲.wav"

# 8) WAV（LIST/INFO チャンクつき）
$FF $(tone 247 2) -c:a pcm_s16le -ac 1 -ar 11025 -metadata title="Wave Info Title" -metadata artist="Wave Artist" -metadata album="Wave Album" wav-info.wav

# 9) ALAC（Apple ロスレス・m4a）
$FF $(tone 330 2) -i cover-c.jpg -map 0:a -map 1:v -c:a alac -c:v copy \
  -metadata title="Lossless Tune" -metadata artist="Tester" -metadata album="Singles" -metadata track="2" \
  -disposition:v attached_pic \
  c2-alac.m4a

# 10) AIFF（ID3 チャンクつき）
$FF $(tone 277 2) -c:a pcm_s16be -ac 1 -ar 11025 -write_id3v2 1 \
  -metadata title="Aiff Title" -metadata artist="Aiff Artist" -metadata album="Aiff Album" aiff-id3.aiff

# 11) MP3（タグなし・VBR）
$FF $(tone 494 4) -c:a libmp3lame -q:a 6 -write_id3v1 0 -write_id3v2 0 -map_metadata -1 notag-vbr.mp3

# 12) MP3（ID3v2.3 と ID3v1 の両方）
$FF $(tone 587 2) -c:a libmp3lame -b:a 64k -id3v2_version 3 -write_id3v1 1 \
  -metadata title="Both Tags" -metadata artist="Tester" -metadata album="Singles" -metadata track="3" -metadata genre="Blues" \
  both-tags.mp3

ls -la
